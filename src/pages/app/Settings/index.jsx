import { useEffect, useState } from 'react'

import { getStoredTheme, setTheme } from '../../../lib/theme'
import { getLang, setLang } from '../../../lib/storage'
import { Input, Checkbox, FormSection, Select } from '../../../components/inputs'
import strings, { locales } from '../../../localization'

const LANG_OPTIONS = locales.map((code) => ({
  value: code,
  label: strings(`language.${code}`),
}))

const Settings = () => {
  const [darkMode, setDarkMode] = useState(false)
  const [lang, setLangState] = useState(getLang() || 'en')

  useEffect(() => {
    const stored = getStoredTheme()
    setDarkMode(stored === 'dark' || (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches))
  }, [])

  useEffect(() => {
    setLangState(getLang() || 'en')
  }, [])

  const handleDarkModeChange = (e) => {
    const checked = e.target.checked
    setDarkMode(checked)
    setTheme(checked ? 'dark' : 'light')
  }

  const handleLangChange = (e) => {
    const newLang = e.target.value
    if (newLang && newLang !== lang) {
      setLang(newLang)
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="space-y-6">
        <FormSection title={strings('page.settings.profile')} gridClassName="flex flex-col gap-4">
          <Input
            id="name"
            label={strings('page.settings.name')}
            name="name"
            type="text"
            placeholder={strings('page.settings.yourName')}
          />
          <Input
            id="email"
            label={strings('page.settings.email')}
            name="email"
            type="email"
            placeholder={strings('page.settings.emailPlaceholder')}
          />
        </FormSection>

        <FormSection title={strings('page.settings.preferences')} gridClassName="flex flex-col gap-3">
          <Select
            label={strings('page.settings.language')}
            name="language"
            value={lang}
            onChange={handleLangChange}
            options={LANG_OPTIONS}
          />
          <Checkbox label={strings('page.settings.emailNotifications')} name="emailNotifications" />
          <Checkbox
            label={strings('page.settings.darkMode')}
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
            {strings('page.settings.saveChanges')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default Settings
