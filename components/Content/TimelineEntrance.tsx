"use client"

import {
  animate,
  createScope,
  set
} from "animejs"
import {
  type ReactNode,
  useEffect,
  useRef
} from "react"

type TimelineEntranceProps = {
  children: ReactNode
}

export default function TimelineEntrance({
  children
}: TimelineEntranceProps) {
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const rootElement = root.current

    if (!rootElement) {
        return
    }

    const scrollContainer = rootElement.parentElement

    if (!scrollContainer) {
        return
    }

    const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
    ).matches

    if (prefersReducedMotion) {
        return
    }

    const scope = createScope({
        root
    }).add(() => {
        const entries =
        rootElement.querySelectorAll<HTMLElement>(
            ".timeline-entry"
        )

        if (entries.length === 0) {
        return
        }

        set(entries, {
        opacity: 0,
        y: 24
        })

        const observer = new IntersectionObserver(
        (observedEntries) => {
            observedEntries.forEach((observedEntry) => {
            if (!observedEntry.isIntersecting) {
                return
            }

            scope.execute(() => {
                animate(observedEntry.target, {
                opacity: 1,
                y: 0,
                duration: 600,
                ease: "out(3)"
                })
            })

            observer.unobserve(observedEntry.target)
            })
        },
        {
            root: scrollContainer,
            threshold: 0.15,
            rootMargin: "0px 0px -8% 0px"
        }
        )

        entries.forEach((entry) => {
        observer.observe(entry)
        })

        return () => {
        observer.disconnect()
        }
    })

    return () => {
        scope.revert()
    }
  }, [])

  return (
    <div ref={root} className="w-full">
      {children}
    </div>
  )
}