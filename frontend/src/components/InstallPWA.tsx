import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault()
      setDeferredPrompt(event as BeforeInstallPromptEvent)
    }

    window.addEventListener('beforeinstallprompt', handler)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [])

  if (!deferredPrompt || dismissed) {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex max-w-xs items-center gap-3 rounded-2xl border border-border/80 bg-card/95 px-4 py-3 text-foreground shadow-2xl backdrop-blur-xl">
      <div className="brand-mark-frame h-11 w-11 shrink-0 rounded-xl p-1">
        <img
          src="/logo-bcs.png"
          alt="BENIN CYBER SHIELD"
          className="h-full w-full rounded-[0.8rem] object-cover"
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground">
          Installer l&apos;application
        </p>
        <p className="truncate text-xs text-muted-foreground">
          BENIN CYBER SHIELD
        </p>
      </div>
      <div className="flex flex-col gap-1">
        <button
          onClick={async () => {
            if (!deferredPrompt) return
            await deferredPrompt.prompt()
            const { outcome } = await deferredPrompt.userChoice
            if (outcome === 'accepted') {
              setDeferredPrompt(null)
            }
          }}
          className="whitespace-nowrap rounded-lg bg-primary px-3 py-1 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Installer
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="px-3 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          Plus tard
        </button>
      </div>
    </div>
  )
}
