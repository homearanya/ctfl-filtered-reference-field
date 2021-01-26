// @ts-nocheck
import React, { useState, useEffect } from "react"
import { Button, Flex, Paragraph } from "@contentful/forma-36-react-components"
import { MultipleEntryReferenceEditor } from "@contentful/field-editor-reference"
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

  const { descriptionFieldName, relatedFieldID } = props.sdk.parameters.instance

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

  const openSearch = async (
    locale,
    contentTypeID,
    contentTypeFieldTitle,
    contentTypeFieldDescription,
    relatedFieldID,
    relatedContentTypeFieldTitles,
    selectedRelatedField,
    multiple
  ) => {
    const selectedEntries = await props.sdk.dialogs.openCurrentApp({
      title: "Insert existing entries",
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
        multiple,
      },
    })
    if (selectedEntries) {
      const newEntries = multiple
        ? [...entries, ...selectedEntries]
        : [...selectedEntries]
      setEntries(newEntries)
      props.sdk.field.setValue(newEntries)
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
                acc[relatedContentType.sys.id] = relatedContentType.displayField
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
                }
              })
            } else {
              setSelectedRelatedField(null)
            }
          })
          .catch((error) => {
            console.log(
              "there has been an error (getContentType - contentTypeFieldTitle): ",
              error
            )
            setErrorMessage("The app configuration is not correct")
          })
      })

      .catch((error) => {
        console.log(
          "there has been an error (getContentType - contentTypeFieldTitle): ",
          errornpm
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
    if (entries.length > 0) {
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
        <MultipleEntryReferenceEditor
          renderCustomActions={() => null}
          entityType="Entry"
          viewType="link"
          sdk={props.sdk}
          isInitiallyDisabled={false}
          parameters={{
            instance: {
              showCreateEntityAction: false,
              showLinkEntityAction: false,
            },
          }}
        />
      </Flex>
      <Button
        onClick={() =>
          openSearch(
            locale,
            contentTypeID,
            contentTypeFieldTitle,
            descriptionFieldName,
            relatedFieldID,
            relatedContentTypeFieldTitles,
            selectedRelatedField,
            multiple
          )
        }
      >
        {buttonText}
      </Button>
    </>
  )
}

export default Field
