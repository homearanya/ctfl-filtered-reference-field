// @ts-nocheck
import React, { useState, useEffect } from "react"
import { Flex, EntryCard, Button } from "@contentful/forma-36-react-components"
import { DialogExtensionSDK } from "@contentful/app-sdk"
import FilterAutoComplete from "./FilterAutoComplete"
// import FilterAutoCompleteEntries from "./FilterAutoCompleteEntries"

const findStatus = (publishedVersion, version, archivedVersion) => {
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
  } = props.sdk.parameters.invocation
  const [filter, setFilter] = useState(selectedRelatedField)

  const [selectedEntries, setSelectedEntries] = useState([])

  const [entries, setEntries] = useState([])
  const [items, setItems] = useState([])

  const insertEntries = () => {
    props.sdk.close(
      selectedEntries.map((e) => {
        return {
          sys: {
            type: "Link",
            linkType: "Entry",
            id: entries[e].sys.id,
          },
        }
      })
    )
  }

  useEffect(() => {
    props.sdk.space
      .getEntries(
        filter && filter.id
          ? {
              content_type: contentTypeID,
              [`fields.${relatedFieldID}.sys.id`]: filter.id,
              limit: 1000,
            }
          : {
              content_type: contentTypeID,
              limit: 1000,
            }
      )
      .then((data) => {
        // Filter out entries already inserted on entry
        const entries = data.items.filter((e) => {
          return !alreadySelected.find((item) => {
            return item === e.sys.id
          })
        })
        // Render entries
        setEntries(entries)
        setItems(
          entries.map((entry) => ({
            label: entry.fields[contentTypeFieldTitle]
              ? entry.fields[contentTypeFieldTitle][locale]
              : "",
            lowerCaseLabel: entry.fields[contentTypeFieldTitle]
              ? entry.fields[contentTypeFieldTitle][locale].toLowerCase()
              : "",
            id: entry.sys.id,
          }))
        )
      })
      .catch((error) =>
        console.log("there has been an error(getEntries): ", error)
      )
    // eslint-disable-next-line
  }, [filter && filter.id])

  console.log({ entries, items })
  return (
    <Flex padding="spacingXl" flexDirection="column">
      <Flex marginBottom="spacingL">
        <FilterAutoComplete
          sdk={props.sdk}
          relatedFieldID={relatedFieldID}
          selectedRelatedField={selectedRelatedField}
          relatedContentTypeFieldTitles={relatedContentTypeFieldTitles}
          locale={locale}
          setFilter={setFilter}
        />
        {/* <FilterAutoCompleteEntries
          entries={items}
          contentType={contentTypeID}
          setFilter={setFilter}
        /> */}
      </Flex>
      <Flex
        flexDirection="column"
        marginBottom="spacingL"
        style={{ height: "500px", overflowY: "auto" }}
      >
        {entries.map((entry, index) => {
          const isSelected = selectedEntries.findIndex((e) => e === index) > -1

          return (
            <Flex
              key={index}
              marginBottom="spacingM"
              fullWidth
              flexDirection="column"
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
                }}
                size="auto"
                className={`entry-card${isSelected ? "-selected" : ""}`}
              />
            </Flex>
          )
        })}
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
