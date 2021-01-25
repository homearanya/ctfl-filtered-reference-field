// @ts-nocheck
import React, { useState, useEffect } from "react"
import {
  Flex,
  Paragraph,
  EntryCard,
  Button,
} from "@contentful/forma-36-react-components"
import { DialogExtensionSDK } from "@contentful/app-sdk"

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
  const [selectedEntries, setSelectedEntries] = useState([])
  const [filterName, setFilterName] = useState("")
  const [entries, setEntries] = useState([])

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
    if (props.sdk.parameters.invocation.filterValue) {
      props.sdk.space
        .getEntry(props.sdk.parameters.invocation.filterValue)
        .then((entry) => {
          props.sdk.space
            .getContentType(entry.sys.contentType.sys.id)
            .then((contentType) => {
              setFilterName(
                entry.fields[contentType.displayField][
                  props.sdk.parameters.invocation.locale
                ]
              )
            })
            .catch((error) =>
              console.log("there has been an error (getContentType): ", error)
            )
        })
        .catch((error) =>
          console.log("there has been an error (getEntry): ", error)
        )
    }
    props.sdk.space
      .getEntries({
        content_type: props.sdk.parameters.invocation.contentType,
        [`fields.${props.sdk.parameters.invocation.filterName}.sys.id`]: props
          .sdk.parameters.invocation.filterValue,
      })
      .then((data) => {
        setEntries(
          data.items.filter((e) => {
            return !props.sdk.parameters.invocation.alreadySelected.find(
              (item) => {
                return item === e.sys.id
              }
            )
          })
        )
      })
      .catch((error) =>
        console.log("there has been an error(getEntries): ", error)
      )
    // eslint-disable-next-line
  }, [])
  return (
    <Flex padding="spacingXl" flexDirection="column">
      <Flex marginBottom="spacingL">
        <Paragraph>{`Filtered by: ${filterName}`}</Paragraph>
      </Flex>
      <Flex
        flexDirection="column"
        marginBottom="spacingS"
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
                  entry.fields[props.sdk.parameters.invocation.titleFieldName][
                    props.sdk.parameters.invocation.locale
                  ]
                }
                description={
                  entry.fields[
                    props.sdk.parameters.invocation.descriptionFieldName
                  ][props.sdk.parameters.invocation.locale]
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
