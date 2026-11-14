import { Safari } from "@/registry/magicui/safari"

export default function SafariDemo() {
  return (
    <div className="flex h-full w-full items-center justify-center px-8">
      <Safari
        className="w-[820px]"
        url="magicui.design"
        imageSrc="/third-party/magic-ui/media/photo.jpg"
      />
    </div>
  )
}
