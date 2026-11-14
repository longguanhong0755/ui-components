import { Iphone } from "@/registry/magicui/iphone"

export default function IphoneDemo() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <Iphone
        className="w-[300px]"
        videoSrc="/third-party/magic-ui/media/demo.mp4"
      />
    </div>
  )
}
