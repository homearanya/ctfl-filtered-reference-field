// @ts-nocheck
import React, { useState, useEffect } from "react"
import { Button, Flex, Paragraph } from "@contentful/forma-36-react-components"
import {
  SingleEntryReferenceEditor,
  MultipleEntryReferenceEditor,
} from "@contentful/field-editor-reference"
import { Action } from "@contentful/field-editor-reference/dist/types"
import { FieldExtensionSDK } from "@contentful/app-sdk"

interface FieldProps {
  sdk: FieldExtensionSDK
}

const Field = (props: FieldProps) => {
  const [errorMessage, setErrorMessage] = useState("")
  const [contentTypeFieldTitle, setContentTypeFieldTitle] = useState("")
  const [
    relatedContentTypeFieldTitles,
    setRelatedContentTypeFieldTitles,
  ] = useState({})

  const [selectedRelatedField, setSelectedRelatedField] = useState(null)
  const [entries, setEntries] = useState(props.sdk.field.getValue() || [])
  const [loading, setLoading] = useState(true)

  const {
    descriptionFieldName,
    relatedFieldID,
    relatedContentTypeID,
  } = props.sdk.parameters.instance

  const locale = props.sdk.field.locale

  let contentTypeID, multiple
  // single
  if (props.sdk.field.type === "Link") {
    multiple = false
    if (
      !props.sdk.field.validations[0] ||
      !props.sdk.field.validations[0].linkContentType[0]
    ) {
      setErrorMessage("No Content Type")
    } else {
      contentTypeID = props.sdk.field.validations[0].linkContentType[0]
    }
  } else {
    // multiple
    multiple = true
    if (
      !props.sdk.field.items.validations[0] ||
      !props.sdk.field.items.validations[0].linkContentType[0]
    ) {
      setErrorMessage("No Content Type")
    } else {
      contentTypeID = props.sdk.field.items.validations[0].linkContentType[0]
    }
  }

  const onAction = (action: Action) => {
    const { type, id } = action
    if (type === "delete") {
      setEntries((entries) => entries.filter((entry) => entry.sys.id !== id))
    }
  }

  const openSearch = async (
    locale,
    contentTypeID,
    contentTypeFieldTitle,
    contentTypeFieldDescription,
    relatedFieldID,
    relatedContentTypeFieldTitles,
    selectedRelatedField,
    multiple,
    entries
  ) => {
    let title
    if (multiple) {
      title = "Add exisiting entries"
    } else {
      if (entries) {
        title = "Replace entry"
      } else {
        title = "Add an existing entry"
      }
    }
    const selectedEntries = await props.sdk.dialogs.openCurrentApp({
      title: title,
      minHeight: 700,
      width: 800,
      shouldCloseOnEscapePress: true,
      shouldCloseOnOverlayClick: true,
      allowHeightOverflow: true, // TODO: this is a temporary fix to make sure we can infinitely scroll
      parameters: {
        locale,
        contentTypeID,
        contentTypeFieldTitle,
        contentTypeFieldDescription,
        relatedFieldID,
        relatedContentTypeFieldTitles,
        selectedRelatedField,
        alreadySelected: entries.map((e) => e.sys.id),

        // alreadySelected: multiple
        //   ? entries.map((e) => e.sys.id)
        //   : [entries.sys.id],
        multiple,
      },
    })
    if (selectedEntries) {
      const newEntries = multiple
        ? [...entries, ...selectedEntries]
        : [...selectedEntries]
      setEntries(newEntries)
      props.sdk.field.setValue(multiple ? newEntries : { ...newEntries[0] })
    }
  }

  // Fetch content type information for main and related fields
  useEffect(() => {
    let detachChangeHandler
    setErrorMessage("")
    // Main content type
    props.sdk.space
      .getContentType(contentTypeID)
      .then((contentType) => {
        setContentTypeFieldTitle(contentType.displayField)
        // Related content type
        const relatedField = contentType.fields.find(
          (e) => e.id === relatedFieldID
        )
        // fetch related field on current entry (if any)
        if (relatedField) {
          // Can be more than 1 content type
          const relatedContentTypesIDs = relatedField
            ? relatedField.validations[0].linkContentType
            : []
          // title fields for all related content types
          Promise.all(
            relatedContentTypesIDs.map((relatedContentTypeID) =>
              props.sdk.space.getContentType(relatedContentTypeID)
            )
          )
            .then((relatedContentTypes) => {
              const fieldTitles = relatedContentTypes.reduce(
                (acc, relatedContentType) => {
                  acc[relatedContentType.sys.id] =
                    relatedContentType.displayField
                  return acc
                },
                {}
              )
              setRelatedContentTypeFieldTitles(fieldTitles)
              // fetch related field on current entry (if any)
              if (props.sdk.entry.fields[relatedFieldID]) {
                detachChangeHandler = props.sdk.entry.fields[
                  relatedFieldID
                ].onValueChanged((value) => {
                  const valueID = value ? value.sys.id : null
                  if (valueID) {
                    props.sdk.space
                      .getEntry(valueID)
                      .then((entry) => {
                        const contentType = entry.sys.contentType.sys.id
                        const titleField = fieldTitles[contentType]
                        setSelectedRelatedField({
                          id: valueID,
                          title: entry.fields[titleField][locale],
                          contentType,
                        })
                        setLoading(false)
                      })
                      .catch((error) => {
                        console.log(
                          "there has been an error (getContentType): ",
                          error
                        )
                        setErrorMessage("The app configuration is not correct")
                      })
                  } else {
                    setSelectedRelatedField(null)
                    setLoading(false)
                  }
                })
              } else {
                // related field id is not in the entry
                // Searching for entries linking from
                props.sdk.space
                  .getEntries({ links_to_entry: props.sdk.ids.entry })
                  .then((entries) => {
                    let lookUpField
                    if (entries.items.length > 0) {
                      // look by relatedFieldID or relatedContentID
                      if (entries.items[0].fields[relatedFieldID]) {
                        lookUpField = relatedFieldID
                      } else if (
                        entries.items[0].fields[relatedContentTypeID]
                      ) {
                        lookUpField = relatedContentTypeID
                      }
                    }

                    if (lookUpField) {
                      const valueID =
                        entries.items[0].fields[lookUpField][locale].sys.id
                      props.sdk.space
                        .getEntry(valueID)
                        .then((entry) => {
                          const contentTypeID = entry.sys.contentType.sys.id
                          const titleField = fieldTitles[contentTypeID]

                          setSelectedRelatedField({
                            id: valueID,
                            title: entry.fields[titleField][locale],
                            contentType: contentTypeID,
                          })
                          setLoading(false)
                        })
                        .catch((error) => {
                          console.log(
                            "there has been an error (getContentType): ",
                            error
                          )
                          setErrorMessage(
                            "The app configuration is not correct"
                          )
                        })
                    } else {
                      // No related field information
                      setSelectedRelatedField(null)
                      setLoading(false)
                    }
                  })
                  .catch((error) => {
                    console.log(
                      "there has been an error (getContentType - contentTypeFieldTitle): ",
                      error
                    )
                    setErrorMessage("The app configuration is not correct")
                  })
              }
            })
            .catch((error) => {
              console.log(
                "there has been an error (getContentType - contentTypeFieldTitle): ",
                error
              )
              setErrorMessage("The app configuration is not correct")
            })
        }
      })
      .catch((error) => {
        console.log(
          "there has been an error (getContentType - contentTypeFieldTitle): ",
          error
        )
        setErrorMessage("The app configuration is not correct")
      })

    props.sdk.window.startAutoResizer()
    return detachChangeHandler
    // eslint-disable-next-line
  }, [])

  let buttonText
  if (multiple) {
    buttonText = "Add exisiting entries"
  } else {
    if (entries) {
      buttonText = "Replace entry"
    } else {
      buttonText = "Add an existing entry"
    }
  }

  return errorMessage ? (
    <Paragraph>{errorMessage}</Paragraph>
  ) : (
    <>
      <Flex marginBottom="spacingS" flexDirection="column">
        {multiple ? (
          <MultipleEntryReferenceEditor
            renderCustomActions={() => null}
            entityType="Entry"
            viewType="link"
            sdk={props.sdk}
            isInitiallyDisabled={false}
            onAction={onAction}
            parameters={{
              instance: {
                showCreateEntityAction: false,
                showLinkEntityAction: false,
              },
            }}
          />
        ) : (
          <SingleEntryReferenceEditor
            renderCustomActions={() => null}
            entityType="Entry"
            viewType="link"
            sdk={props.sdk}
            isInitiallyDisabled={false}
            onAction={onAction}
            parameters={{
              instance: {
                showCreateEntityAction: false,
                showLinkEntityAction: false,
              },
            }}
          />
        )}
      </Flex>
      <Button
        loading={loading}
        disabled={loading}
        onClick={() =>
          openSearch(
            locale,
            contentTypeID,
            contentTypeFieldTitle,
            descriptionFieldName,
            relatedFieldID,
            relatedContentTypeFieldTitles,
            selectedRelatedField,
            multiple,
            entries
          )
        }
      >
        {!loading && buttonText}
      </Button>
    </>
  )
}

export default Field
