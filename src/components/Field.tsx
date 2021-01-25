// @ts-nocheck
import React, { useState, useEffect, useMemo } from "react"
import { Button, Flex } from "@contentful/forma-36-react-components"
import { MultipleEntryReferenceEditor } from "@contentful/field-editor-reference"
import { FieldExtensionSDK } from "@contentful/app-sdk"

interface FieldProps {
  sdk: FieldExtensionSDK
}

const Field = (props: FieldProps) => {
  const [entries, setEntries] = useState(props.sdk.field.getValue() || [])

  const contentTypeName = useMemo(() => {
    const itemFound = props.sdk.editor.editorInterface.controls.find(
      (e) => e.fieldId === props.sdk.field.id
    )
    return itemFound ? itemFound.field.name : ""
  }, [props.sdk.editor.editorInterface.controls])

  const openSearch = async () => {
    const selectedEntries = await props.sdk.dialogs.openCurrentApp({
      title: "Insert existing entries",
      minHeight: 670,
      width: 800,
      shouldCloseOnEscapePress: true,
      shouldCloseOnOverlayClick: true,
      allowHeightOverflow: true, // TODO: this is a temporary fix to make sure we can infinitely scroll
      parameters: {
        descriptionFieldName:
          props.sdk.parameters.instance.descriptionFieldName,
        locale: props.sdk.parameters.instance.locale,
        contentType: props.sdk.parameters.instance.contentType,
        contentTypeName: contentTypeName,
        filterName: props.sdk.parameters.instance.relatedField,
        filterValue: props.sdk.entry.fields[
          props.sdk.parameters.instance.relatedField
        ].getValue()
          ? props.sdk.entry.fields[
              props.sdk.parameters.instance.relatedField
            ].getValue().sys.id
          : "",
        alreadySelected: entries.map((e) => e.sys.id),
      },
    })
    if (selectedEntries) {
      const newEntries = [...entries, ...selectedEntries]
      setEntries(newEntries)
      props.sdk.field.setValue(newEntries)
    }
  }

  useEffect(() => {
    props.sdk.field.onValueChanged(() =>
      setEntries(props.sdk.field.getValue() || [])
    )
    props.sdk.window.startAutoResizer()
  }, [props.sdk.window])
  return (
    <>
      <Flex marginBottom="spacingS" flexDirection="column">
        <MultipleEntryReferenceEditor
          renderCustomActions={() => null}
          entityType="Entry"
          viewType="link"
          sdk={props.sdk}
          isInitiallyDisabled={true}
          parameters={{
            instance: {
              showCreateEntityAction: false,
              showLinkEntityAction: false,
            },
          }}
        />
      </Flex>
      <Button onClick={openSearch}>Add exisiting entries</Button>
    </>
  )
}

export default Field
