// @ts-nocheck
import React, { useState, useEffect, useCallback } from "react"
import { Autocomplete } from "@contentful/forma-36-react-components"
import { DialogExtensionSDK } from "@contentful/app-sdk"

type Item = {
  label: string
  lowerCaseLabel: string
  id: string
  contentType: string
}

type SelectedRelatedField = {
  id: string
  title: string
  contentType: string
}

interface FilterAutoCompleteProps {
  sdk: DialogExtensionSDK
  relatedFieldID: string
  selectedRelatedField: SelectedRelatedField | null
  relatedContentTypeFieldTitles: { [key: string]: string }
  locale: string
  setFilter: (e: SelectedRelatedField) => void
  setEntryFilter: () => void
}

const FilterAutoComplete = ({
  sdk,
  relatedFieldID,
  selectedRelatedField,
  relatedContentTypeFieldTitles,
  locale,
  setFilter,
  setEntryFilter,
}: FilterAutoCompleteProps) => {
  const [isLoading, setIsLoading] = useState(false)
  const [items, setItems] = useState<Item[] | []>([])
  const [filteredItems, setFilteredItems] = useState<Item[] | []>([])
  // eslint-disable-next-line
  const [selectedItem, setSelectedItem] = useState<Item | null>(
    selectedRelatedField && selectedRelatedField.id
      ? {
          label: selectedRelatedField.title,
          lowerCaseLabel: selectedRelatedField.title.toLowerCase(),
          id: selectedRelatedField.id,
          contentType: selectedRelatedField.contentType,
        }
      : null
  )

  const handleQueryChange = useCallback(
    (query: string) => {
      const lowerCaseQuery = query.toLowerCase()
      setFilteredItems(
        query
          ? items.filter((item) => item.lowerCaseLabel.includes(lowerCaseQuery))
          : items
      )
    },
    [items, setFilteredItems]
  )

  useEffect(() => {
    setIsLoading(true)
    Promise.all(
      Object.keys(relatedContentTypeFieldTitles).map((relatedContentId) =>
        sdk.space.getEntries({
          content_type: relatedContentId,
          limit: 1000,
        })
      )
    )
      .then((dataArray) => {
        const dataItems = dataArray.reduce((acc, data) => {
          const newArray = [...acc, ...data.items]
          return newArray
        }, [])
        const items = dataItems
          .filter(
            (item) =>
              item.fields[
                relatedContentTypeFieldTitles[item.sys.contentType.sys.id]
              ]
          )
          .map((item) => {
            return {
              label:
                item.fields[
                  relatedContentTypeFieldTitles[item.sys.contentType.sys.id]
                ][locale],
              lowerCaseLabel: item.fields[
                relatedContentTypeFieldTitles[item.sys.contentType.sys.id]
              ][locale].toLowerCase(),
              id: item.sys.id,
              contentType: item.sys.contentType.sys.id,
            }
          })
        setItems(items)
        setFilteredItems(items)
        setIsLoading(false)
      })

      .catch((error) =>
        console.log("there has been an error(getEntries): ", error)
      )
    // eslint-disable-next-line
  }, [])

  return (
    <Autocomplete<Item>
      maxHeight={200}
      items={filteredItems}
      onQueryChange={handleQueryChange}
      onChange={(e) => {
        setSelectedItem(e)
        const newSelectedRelatedField = {
          title: e.label,
          id: e.id,
          contentType: e.contentType,
        }
        setFilter(newSelectedRelatedField)
        setEntryFilter(null)
      }}
      placeholder={
        selectedItem ? selectedItem.label : `Choose ${relatedFieldID}`
      }
      isLoading={isLoading}
      width="medium"
      disabled={false}
      emptyListMessage="There are no items to choose from"
      noMatchesMessage="No matches"
      dropdownProps={{ isFullWidth: true }}
    >
      {(options: Item[]) =>
        options.map((option: Item) => (
          <span key={option.lowerCaseLabel}>{option.label}</span>
        ))
      }
    </Autocomplete>
  )
}

export default FilterAutoComplete
