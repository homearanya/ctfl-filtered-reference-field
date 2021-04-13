// @ts-nocheck
import React, { useState, useEffect } from "react"
import {
  Flex,
  EntryCard,
  Button,
  Heading,
  TextInput,
} from "@contentful/forma-36-react-components"
import { DialogExtensionSDK } from "@contentful/app-sdk"
import FilterAutoComplete from "./FilterAutoComplete"

const findStatus = (publishedVersion, version) => {
  if (!publishedVersion) return "draft"
  if (!!publishedVersion && version >= publishedVersion + 2) {
    return "changed"
  }
  if (!!publishedVersion && version >= publishedVersion + 1) {
    return "published"
  }
  return "archived"
}

interface DialogProps {
  sdk: DialogExtensionSDK
}

const Dialog = (props: DialogProps) => {
  const {
    locale,
    contentTypeID,
    contentTypeFieldTitle,
    contentTypeFieldDescription,
    relatedFieldID,
    relatedContentTypeFieldTitles,
    selectedRelatedField,
    alreadySelected,
    multiple,
  } = props.sdk.parameters.invocation
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState(selectedRelatedField)

  const [selectedEntries, setSelectedEntries] = useState([])

  const [entries, setEntries] = useState([])
  const [filteredEntries, setFilteredEntries] = useState([])
  const [entryFilter, setEntryFilter] = useState<string>("")

  const insertEntries = () => {
    props.sdk.close(
      selectedEntries.map((e) => {
        return {
          sys: {
            type: "Link",
            linkType: "Entry",
            id: filteredEntries[e].sys.id,
          },
        }
      })
    )
  }

  const getAllEntries = (items) => {
    return props.sdk.space
      .getEntries(
        filter && filter.id
          ? {
              content_type: contentTypeID,
              [`fields.${relatedFieldID}.sys.id`]: filter.id,
              skip: items.length,
              limit: 1000,
            }
          : {
              content_type: contentTypeID,
              skip: items.length,
              limit: 1000,
            }
      )
      .then((data) => {
        const moreItems = [...items, ...data.items]
        if (data.items.length === 1000) {
          return getAllEntries(moreItems)
        } else {
          return moreItems
        }
      })
  }

  useEffect(() => {
    setLoading(true)
    getAllEntries([])
      .then((items) => {
        // Filter out entries already inserted on entry
        const entries = items.filter((e) => {
          return !alreadySelected.find((item) => {
            return item === e.sys.id
          })
        })
        // Render entries
        setEntries(entries)
        setFilteredEntries(entries)
        setEntryFilter("")
        setLoading(false)
      })
      .catch((error) => {
        console.log("there has been an error(getEntries): ", error)
        setLoading(false)
      })
    // eslint-disable-next-line
  }, [filter && filter.id])

  useEffect(() => {
    if (entryFilter.length > 1) {
      const lcEntryFilter = entryFilter.toLowerCase()
      {
        const filteredEntries = entries.filter((entry) => {
          const lcTitle = entry.fields.title
            ? entry.fields.title["en-US"].toLowerCase()
            : undefined
          // const lcDescription =
          //   entry.fields.description && entry.fields.description["en-US"]
          //     ? entry.fields.description["en-US"].toLowerCase()
          //     : undefined
          return (
            lcTitle && lcTitle.includes(lcEntryFilter)
            // || (lcDescription && lcDescription.includes(lcEntryFilter))
          )
        })
        setFilteredEntries(filteredEntries)
      }
    }
  }, [entryFilter, setEntryFilter, entries])

  console.log(entries, filteredEntries, selectedEntries)
  return (
    <Flex padding="spacingXl" flexDirection="column">
      <Flex marginBottom="spacingL">
        <Flex marginRight="spacingXl">
          <FilterAutoComplete
            sdk={props.sdk}
            relatedFieldID={relatedFieldID}
            selectedRelatedField={selectedRelatedField}
            relatedContentTypeFieldTitles={relatedContentTypeFieldTitles}
            locale={locale}
            setFilter={setFilter}
            setEntryFilter={() => {}}
          />
        </Flex>
        <Flex marginRight="spacingXl">
          <TextInput
            placeholder="Search..."
            name="text-input"
            onChange={(e) => setEntryFilter(e.target.value)}
            width="medium"
            disabled={loading}
            value={entryFilter}
          />
        </Flex>
        <Button
          buttonType="negative"
          onClick={() => {
            setEntryFilter("")
            setFilteredEntries(entries)
          }}
        >
          Clear
        </Button>
      </Flex>
      <Flex
        flexDirection="column"
        marginBottom="spacingL"
        style={{ height: "500px", overflowY: "auto" }}
      >
        {loading ? (
          <Heading element="p">Loading...</Heading>
        ) : (
          filteredEntries.map((entry, index) => {
            const isSelected =
              selectedEntries.findIndex((e) => e === index) > -1

            return (
              <Flex
                key={index}
                marginBottom="spacingM"
                fullWidth
                flexDirection="column"
                noShrink
                styled={{ cursor: "pointer" }}
              >
                <EntryCard
                  title={
                    entry.fields[contentTypeFieldTitle]
                      ? entry.fields[contentTypeFieldTitle][locale]
                      : ""
                  }
                  description={
                    entry.fields[contentTypeFieldDescription]
                      ? entry.fields[contentTypeFieldDescription][locale]
                      : ""
                  }
                  contentType={props.sdk.parameters.invocation.contentTypeName}
                  status={findStatus(
                    entry.sys.publishedVersion,
                    entry.sys.version,
                    entry.sys.archivedVersion
                  )}
                  selected={isSelected}
                  onClick={() => {
                    const findIndex = selectedEntries.findIndex(
                      (e) => e === index
                    )
                    if (multiple) {
                      if (findIndex === -1) {
                        setSelectedEntries((selectedEntries) => [
                          ...selectedEntries,
                          index,
                        ])
                      } else {
                        setSelectedEntries((selectedEntries) => [
                          ...selectedEntries.slice(0, findIndex),
                          ...selectedEntries.slice(findIndex + 1),
                        ])
                      }
                    } else {
                      // single
                      if (findIndex === -1) {
                        setSelectedEntries([index])
                      } else {
                        setSelectedEntries([])
                      }
                    }
                  }}
                  size="auto"
                  className={`entry-card${isSelected ? "-selected" : ""}`}
                />
              </Flex>
            )
          })
        )}
      </Flex>
      <Flex>
        <Flex marginRight="spacingM">
          <Button
            disabled={selectedEntries.length === 0}
            buttonType="positive"
            onClick={insertEntries}
          >
            {`Insert ${selectedEntries.length} Entries`}
          </Button>
        </Flex>
        <Flex>
          <Button buttonType="negative" onClick={() => props.sdk.close()}>
            Cancel
          </Button>
        </Flex>
      </Flex>
    </Flex>
  )
}

export default Dialog
