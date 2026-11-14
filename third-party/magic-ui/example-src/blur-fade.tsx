import { BlurFade } from "@/registry/magicui/blur-fade"

const images = Array.from(
  { length: 9 },
  (_, i) => `/third-party/magic-ui/media/photo-${(i % 6) + 1}.jpg`
)

export default function BlurFadeDemo() {
  return (
    <section id="photos" className="w-full max-w-3xl px-6">
      <div className="columns-3 gap-4">
        {images.map((imageUrl, idx) => (
          <BlurFade key={`${imageUrl}-${idx}`} delay={0.1 + idx * 0.05} inView>
            <img
              className="mb-4 w-full rounded-lg object-cover"
              src={imageUrl}
              alt={`Gradient artwork ${idx + 1}`}
            />
          </BlurFade>
        ))}
      </div>
    </section>
  )
}
