import { useState, useEffect } from "react"
import { FieldExtensionSDK } from "@contentful/app-sdk"

const useContentfulEntryField = (sdk: FieldExtensionSDK, name: string) => {
  const initialValue = sdk.entry.fields[name].getValue()
  const [value, setState] = useState(initialValue)
  useEffect(() => {
    sdk.window.startAutoResizer()
    const detachChangeHandler = sdk.entry.fields[name].onValueChanged(setState)
    return detachChangeHandler
    // eslint-disable-next-line
  }, [])
  function onChange(value: any) {
    setState(value)
    sdk.entry.fields[name].setValue(value)
  }
  return [value, onChange]
}
const useContentfulField = (sdk: FieldExtensionSDK) => {
  const initialValue = sdk.field.getValue()
  const [value, setState] = useState(initialValue)
  useEffect(() => {
    sdk.window.startAutoResizer()
    const detachChangeHandler = sdk.field.onValueChanged(setState)
    return detachChangeHandler
    // eslint-disable-next-line
  }, [])
  function onChange(value: any) {
    setState(value)
    sdk.field.setValue(value)
  }
  return [value, onChange]
}
export { useContentfulField, useContentfulEntryField }
