// @ts-nocheck
import React, { useState, useCallback, useEffect } from "react"
import { Autocomplete } from "@contentful/forma-36-react-components"

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

interface FilterAutoCompleteEntriesProps {
  entries: Item[]
  contentType: string
  setFilter: (e: SelectedRelatedField) => void
}

const FilterAutoCompleteEntries = ({
  entries,
  contentType,
  entryFilter,
  setEntryFilter,
}: FilterAutoCompleteEntriesProps) => {
  const [filteredItems, setFilteredItems] = useState<Item[] | []>([])

  const handleQueryChange = useCallback(
    (query: string) => {
      const lowerCaseQuery = query.toLowerCase()
      setFilteredItems(
        query
          ? entries.filter((item) =>
              item.lowerCaseLabel.includes(lowerCaseQuery)
            )
          : entries
      )
    },
    [entries, setFilteredItems]
  )
  useEffect(() => {
    setFilteredItems(entries)
  }, [entries])
  return (
    <Autocomplete<Item>
      maxHeight={200}
      items={filteredItems}
      onQueryChange={handleQueryChange}
      onChange={(e) => {
        setEntryFilter(e)
      }}
      placeholder={entryFilter ? entryFilter.label : `Choose ${contentType}`}
      isLoading={false}
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

export default FilterAutoCompleteEntries
