import { useEffect, useState } from 'react'

import { getStoredTheme, setTheme } from '../../../lib/theme'
import { Input, Checkbox, FormSection } from '../../../components/inputs'

const Settings = () => {
  const [darkMode, setDarkMode] = useState(false)

  useEffect(() => {
    const stored = getStoredTheme()
    setDarkMode(stored === 'dark' || (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches))
  }, [])

  const handleDarkModeChange = (e) => {
    const checked = e.target.checked
    setDarkMode(checked)
    setTheme(checked ? 'dark' : 'light')
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="space-y-6">
        <FormSection title="Profile" gridClassName="flex flex-col gap-4">
          <Input
            id="name"
            label="Name"
            name="name"
            type="text"
            placeholder="Your name"
          />
          <Input
            id="email"
            label="Email"
            name="email"
            type="email"
            placeholder="you@example.com"
          />
        </FormSection>

        <FormSection title="Preferences" gridClassName="flex flex-col gap-3">
          <Checkbox label="Email notifications" name="emailNotifications" />
          <Checkbox
            label="Dark mode"
            name="darkMode"
            checked={darkMode}
            onChange={handleDarkModeChange}
          />
        </FormSection>

        <div>
          <button
            type="button"
            className="rounded-lg bg-slate-900 px-4 py-2 font-medium text-white hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
          >
            Save changes
          </button>
        </div>
      </div>
    </div>
  )
}

export default Settings
