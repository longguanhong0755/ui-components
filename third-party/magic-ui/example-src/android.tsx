import { Android } from "@/registry/magicui/android"

export default function AndroidDemo() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <Android
        width={300}
        height={611}
        videoSrc="/third-party/magic-ui/media/demo.mp4"
      />
    </div>
  )
}
