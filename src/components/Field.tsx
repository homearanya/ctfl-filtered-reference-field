// @ts-nocheck
import React, { useState, useEffect, useRef } from "react"
import {
  Button,
  Flex,
  Paragraph,
  EntryCard,
  DropdownList,
  DropdownListItem,
} from "@contentful/forma-36-react-components"
import {
  SingleEntryReferenceEditor,
  MultipleEntryReferenceEditor,
} from "@contentful/field-editor-reference"
import { Action } from "@contentful/field-editor-reference/dist/types"
import { FieldExtensionSDK } from "@contentful/app-sdk"
import { findStatus } from "../utils/helpers"
import Thumbnail from "./Thumbnail"

interface ActionsMenuProps {
  onEdit?: () => void
  onRemove?: () => void
  onMoveTop?: () => void
  onMoveBottom?: () => void
}
const ActionsMenu = ({
  onEdit,
  onRemove,
  onMoveTop,
  onMoveBottom,
}: ActionsMenuProps) => {
  return (
    <>
      <DropdownList>
        <DropdownListItem onClick={onEdit} isDisabled={!onEdit}>
          Edit
        </DropdownListItem>
        <DropdownListItem onClick={onRemove} isDisabled={!onRemove}>
          Remove
        </DropdownListItem>
      </DropdownList>
      <DropdownList border="top">
        <DropdownListItem onClick={onMoveTop} isDisabled={!onMoveTop}>
          Move to top
        </DropdownListItem>
        <DropdownListItem onClick={onMoveBottom} isDisabled={!onMoveBottom}>
          Move to bottom
        </DropdownListItem>
      </DropdownList>
    </>
  )
}

interface FieldProps {
  sdk: FieldExtensionSDK
}

const Field = (props: FieldProps) => {
  const [errorMessage, setErrorMessage] = useState("")
  const [contentTypeFieldTitle, setContentTypeFieldTitle] = useState("")
  const [relatedContentTypeFieldTitles, setRelatedContentTypeFieldTitles] =
    useState({})
  const activityRef = useRef({})
  const mountRef = useRef(false)
  const [refreshEntry, setRefreshEntry] = useState(false)

  const [selectedRelatedField, setSelectedRelatedField] = useState(null)
  const [entries, setEntries] = useState(props.sdk.field.getValue() || [])
  const [loading, setLoading] = useState(true)

  const entryRefresh = () => setRefreshEntry((refreshEntry) => !refreshEntry)

  const { descriptionFieldName, relatedFieldId, relatedContentTypeId } =
    props.sdk.parameters.instance

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
    relatedFieldId,
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
        relatedFieldId,
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

  const renderCustomCard: CustomCardRenderer = ({
    entity,
    contentType,
    cardDragHandle,
    onEdit,
    onRemove,
    onMoveTop,
    onMoveBottom,
  }) => {
    const imageId = entity?.fields?.images?.[locale][0]?.sys?.id
    const prevEntity = activityRef.current[entity.sys.id]
    if (prevEntity) {
      const prevImages = JSON.stringify(prevEntity.fields.images)
      const currentImages = JSON.stringify(entity.fields.images)
      if (prevImages !== currentImages) {
        console.log("images have changed")
        setTimeout(() => entryRefresh(), 100)
        activityRef.current[entity.sys.id] = entity
      }
    }

    const handlerEdit = () => {
      activityRef.current[entity.sys.id] = entity
      onEdit()
    }
    return (
      <Flex>
        <EntryCard
          title={entity.fields.title ? entity.fields.title[locale] : ""}
          description={
            entity.fields?.description ? entity.fields?.description[locale] : ""
          }
          contentType={contentType?.name}
          status={findStatus(
            entity.sys.publishedVersion,
            entity.sys.version,
            entity.sys.archivedVersion
          )}
          dropdownListElements={
            <ActionsMenu
              onEdit={handlerEdit}
              onRemove={onRemove}
              onMoveTop={onMoveTop}
              onMoveBottom={onMoveBottom}
            />
          }
          cardDragHandleComponent={cardDragHandle}
          onClick={handlerEdit}
          thumbnailElement={
            <Thumbnail imageId={imageId} locale={locale} sdk={props.sdk} />
          }
          size="auto"
          className={`entry-card`}
        />
      </Flex>
    )
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
          (e) => e.id === relatedFieldId
        )
        // fetch related field on current entry (if any)
        if (relatedField) {
          // Can be more than 1 content type
          const relatedContentTypesIDs = relatedField
            ? relatedField.validations[0].linkContentType
            : []
          // title fields for all related content types
          Promise.all(
            relatedContentTypesIDs.map((relatedContentTypeId) =>
              props.sdk.space.getContentType(relatedContentTypeId)
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
              if (props.sdk.entry.fields[relatedFieldId]) {
                detachChangeHandler = props.sdk.entry.fields[
                  relatedFieldId
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
                      // look by relatedFieldId or relatedContentID
                      if (entries.items[0].fields[relatedFieldId]) {
                        lookUpField = relatedFieldId
                      } else if (
                        entries.items[0].fields[relatedContentTypeId]
                      ) {
                        lookUpField = relatedContentTypeId
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
  useEffect(() => {
    // To refresh when activity images have been added, removed or changed
    if (mountRef.current) {
      setTimeout(
        () =>
          entries &&
          props.sdk.field.setValue(multiple ? entries : { ...entries[0] }),
        100
      )
    }
    mountRef.current = true
  }, [entries, multiple, props.sdk.field, refreshEntry])

  return errorMessage ? (
    <Paragraph>{errorMessage}</Paragraph>
  ) : (
    <>
      <Flex marginBottom="spacingS" flexDirection="column">
        {multiple ? (
          <MultipleEntryReferenceEditor
            renderCustomCard={renderCustomCard}
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
            renderCustomCard={renderCustomCard}
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
            relatedFieldId,
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
