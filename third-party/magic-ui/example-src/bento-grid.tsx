import {
  BellIcon,
  CalendarIcon,
  FileTextIcon,
  GlobeIcon,
  InputIcon,
} from "@radix-ui/react-icons"

import { cn } from "@/lib/utils"
import { BentoCard, BentoGrid } from "@/registry/magicui/bento-grid"
import { Marquee } from "@/registry/magicui/marquee"

const files = [
  { name: "bitcoin.pdf", body: "A peer-to-peer electronic cash system." },
  { name: "finances.xlsx", body: "Rows, columns and a year of numbers." },
  { name: "logo.svg", body: "A scalable mark for the next launch." },
  { name: "keys.gpg", body: "Encrypted mail, signed and sealed." },
  { name: "seed.txt", body: "Twelve words, kept somewhere safe." },
]

const notes = [
  { title: "New comment", body: "Ada mentioned you in design.md", tone: "bg-amber-400" },
  { title: "File shared", body: "Lin shared q4-roadmap.pdf", tone: "bg-sky-400" },
  { title: "Build passed", body: "Main deployed in 41 seconds", tone: "bg-emerald-400" },
]

export default function BentoGridDemo() {
  return (
    <div className="flex h-full w-full items-center justify-center p-6">
      <BentoGrid className="w-full auto-rows-[190px] grid-cols-2 lg:grid-cols-3">
        <BentoCard
          name="Save your files"
          className="col-span-2 lg:col-span-1"
          Icon={FileTextIcon}
          description="We automatically save your files as you type."
          href="#"
          cta="Learn more"
          background={
            <Marquee
              pauseOnHover
              vertical
              className="absolute top-4 [mask-image:linear-gradient(to_bottom,transparent_10%,#000_60%,transparent_100%)] [--duration:18s]"
            >
              {files.map((f) => (
                <figure
                  key={f.name}
                  className={cn(
                    "mb-3 w-56 rounded-lg border p-3",
                    "border-neutral-950/10 bg-neutral-950/[.03] dark:border-neutral-50/10 dark:bg-neutral-50/[.06]"
                  )}
                >
                  <figcaption className="text-sm font-medium dark:text-white">
                    {f.name}
                  </figcaption>
                  <blockquote className="mt-1 line-clamp-2 text-xs text-neutral-500 dark:text-neutral-400">
                    {f.body}
                  </blockquote>
                </figure>
              ))}
            </Marquee>
          }
        />
        <BentoCard
          name="Notifications"
          className="col-span-2 row-span-2"
          Icon={BellIcon}
          description="Get notified when something happens."
          href="#"
          cta="Learn more"
          background={
            <div className="absolute inset-x-0 top-0 flex flex-col gap-2 p-4 pt-6 opacity-80 [mask-image:linear-gradient(to_bottom,#000_20%,transparent_90%)]">
              {notes.map((n) => (
                <div
                  key={n.title}
                  className="flex items-start gap-3 rounded-lg border border-neutral-950/10 bg-white/50 p-3 dark:border-neutral-50/10 dark:bg-neutral-900/60"
                >
                  <span className={cn("mt-1 size-2.5 shrink-0 rounded-full", n.tone)} />
                  <div>
                    <p className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
                      {n.title}
                    </p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">{n.body}</p>
                  </div>
                </div>
              ))}
            </div>
          }
        />
        <BentoCard
          name="Full text search"
          className=""
          Icon={InputIcon}
          description="Search through all your files in one place."
          href="#"
          cta="Learn more"
          background={
            <div className="absolute inset-0 flex items-center justify-center p-6">
              <div className="w-full max-w-[220px] rounded-lg border border-neutral-950/10 bg-white/60 p-2 shadow-sm dark:border-neutral-50/10 dark:bg-neutral-900/70">
                <div className="flex items-center gap-2 rounded-md bg-neutral-950/5 px-2 py-1.5 text-xs text-neutral-500 dark:bg-neutral-50/10">
                  <InputIcon className="size-3.5" />
                  Search…
                </div>
              </div>
            </div>
          }
        />
        <BentoCard
          name="Multilingual"
          className=""
          Icon={GlobeIcon}
          description="Supports 100+ languages and counting."
          href="#"
          cta="Learn more"
          background={
            <div className="absolute inset-0 grid place-items-center p-6 text-5xl opacity-20">
              <span aria-hidden="true">文 A あ</span>
            </div>
          }
        />
        <BentoCard
          name="Calendar"
          className=""
          Icon={CalendarIcon}
          description="Use the calendar to filter your files by date."
          href="#"
          cta="Learn more"
          background={
            <div className="absolute right-4 top-4 grid grid-cols-7 gap-1 opacity-40">
              {Array.from({ length: 28 }, (_, i) => (
                <span
                  key={i}
                  className={cn(
                    "size-2 rounded-[2px]",
                    i % 7 === 5 || i % 7 === 6
                      ? "bg-neutral-400 dark:bg-neutral-600"
                      : i === 12
                        ? "bg-amber-500"
                        : "bg-neutral-300 dark:bg-neutral-700"
                  )}
                />
              ))}
            </div>
          }
        />
      </BentoGrid>
    </div>
  )
}
