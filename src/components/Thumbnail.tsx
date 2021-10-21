import { DialogExtensionSDK, FieldExtensionSDK } from "@contentful/app-sdk"
import React, { useEffect, useState } from "react"

interface ThumbnailProps {
  imageId: string
  locale: string
  sdk: FieldExtensionSDK | DialogExtensionSDK
}
const Thumbnail = ({ imageId, locale, sdk }: ThumbnailProps) => {
  const [image, setImageUrl] = useState<{
    url: string
    title: string
  } | null>(null)

  useEffect(() => {
    imageId &&
      sdk.space.getAsset(imageId).then((asset: any) => {
        asset.fields?.file[locale]?.url &&
          setImageUrl({
            url: `https:${asset.fields?.file[locale]?.url}?fit=thumb&w=175`,
            title: asset.fields?.title,
          })
      })
  }, [imageId, locale, sdk])

  if (!imageId || !image) return null
  return <img src={image.url} alt={image.title} />
}

export default Thumbnail
