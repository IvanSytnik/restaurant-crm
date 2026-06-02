'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { LangTabs } from './LangTabs'
import { pickName } from '@/lib/menu/i18n'
import { ALLERGEN_LIST, ALLERGEN_CODES, type AllergenKey } from '@/lib/menu/allergens'
import type { Locale } from '@/i18n/config'

type Category = {
  id: string
  nameDE: string
  nameEN: string | null
  nameUK: string | null
}

type Variant = {
  id?: string
  labelDE: string
  labelEN: string | null
  labelUK: string | null
  price: number | string
}

type Item = {
  id: string
  categoryId: string
  nameDE: string
  nameEN: string | null
  nameUK: string | null
  descriptionDE: string | null
  descriptionEN: string | null
  descriptionUK: string | null
  price: number | string | null
  imageUrl: string | null
  allergens: string[]
  isVegetarian: boolean
  isVegan: boolean
  spicyLevel: number
  isAvailable: boolean
  variants: Variant[]
}

interface Props {
  mode: 'create' | 'edit'
  categories: Category[]
  initial?: Item
}

export function ItemForm({ mode, categories, initial }: Props) {
  const router = useRouter()
  const locale = useLocale() as Locale
  const t = useTranslations('menu.items.form')
  const tAllergens = useTranslations('menu.allergens')
  const tCommon = useTranslations('common')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    categoryId: initial?.categoryId ?? categories[0]?.id ?? '',
    nameDE: initial?.nameDE ?? '',
    nameEN: initial?.nameEN ?? '',
    nameUK: initial?.nameUK ?? '',
    descriptionDE: initial?.descriptionDE ?? '',
    descriptionEN: initial?.descriptionEN ?? '',
    descriptionUK: initial?.descriptionUK ?? '',
    price: initial?.price ? String(initial.price) : '',
    imageUrl: initial?.imageUrl ?? '',
    allergens: initial?.allergens ?? [],
    isVegetarian: initial?.isVegetarian ?? false,
    isVegan: initial?.isVegan ?? false,
    spicyLevel: initial?.spicyLevel ?? 0,
    isAvailable: initial?.isAvailable ?? true,
    variants: (initial?.variants ?? []).map((v) => ({
      labelDE: v.labelDE,
      labelEN: v.labelEN,
      labelUK: v.labelUK,
      price: String(v.price),
    })),
  })

  const [hasVariants, setHasVariants] = useState(
    initial ? initial.variants.length > 0 : false
  )

  function toggleAllergen(key: AllergenKey) {
    setForm((f) => ({
      ...f,
      allergens: f.allergens.includes(key)
        ? f.allergens.filter((a) => a !== key)
        : [...f.allergens, key],
    }))
  }

  function addVariant() {
    setForm((f) => ({
      ...f,
      variants: [...f.variants, { labelDE: '', labelEN: '', labelUK: '', price: '' }],
    }))
  }

  function updateVariant(index: number, field: keyof Variant, value: string) {
    setForm((f) => {
      const newVariants = [...f.variants]
      newVariants[index] = { ...newVariants[index], [field]: value }
      return { ...f, variants: newVariants }
    })
  }

  function removeVariant(index: number) {
    setForm((f) => ({
      ...f,
      variants: f.variants.filter((_, i) => i !== index),
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Валидация: либо цена, либо хотя бы один вариант
    if (!hasVariants && !form.price) {
      setError(t('priceOrVariantsRequired'))
      setLoading(false)
      return
    }

    if (hasVariants && form.variants.length === 0) {
      setError(t('addAtLeastOneVariant'))
      setLoading(false)
      return
    }

    const payload = {
      categoryId: form.categoryId,
      nameDE: form.nameDE,
      nameEN: form.nameEN || null,
      nameUK: form.nameUK || null,
      descriptionDE: form.descriptionDE || null,
      descriptionEN: form.descriptionEN || null,
      descriptionUK: form.descriptionUK || null,
      price: hasVariants ? null : parseFloat(form.price),
      imageUrl: form.imageUrl || null,
      allergens: form.allergens,
      isVegetarian: form.isVegetarian || form.isVegan,
      isVegan: form.isVegan,
      spicyLevel: form.spicyLevel,
      isAvailable: form.isAvailable,
      variants: hasVariants
        ? form.variants.map((v) => ({
            labelDE: v.labelDE,
            labelEN: v.labelEN || null,
            labelUK: v.labelUK || null,
            price: parseFloat(v.price as string),
          }))
        : [],
    }

    const url = mode === 'create' ? '/api/menu/items' : `/api/menu/items/${initial!.id}`
    const method = mode === 'create' ? 'POST' : 'PATCH'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    setLoading(false)

    if (!res.ok) {
      const data = await res.json()
      setError(data.error || 'Error')
      return
    }

    router.push('/admin/menu')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Category */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6">
        <label className="text-sm font-medium text-gray-700 mb-1.5 block">
          {t('category')} <span className="text-red-500">*</span>
        </label>
        <select
          value={form.categoryId}
          onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
          required
          className={inputClass}
        >
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {pickName(cat, locale)}
            </option>
          ))}
        </select>
      </div>

      {/* Names and descriptions */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 space-y-5">
        <LangTabs
          values={{ de: form.nameDE, en: form.nameEN, uk: form.nameUK }}
          onChange={(lang, value) =>
            setForm({
              ...form,
              nameEN: lang === 'en' ? value : form.nameEN,
              nameUK: lang === 'uk' ? value : form.nameUK,
            })
          }
          onDEChange={(v) => setForm({ ...form, nameDE: v })}
          label={t('name')}
          placeholder={{ de: 'Wiener Schnitzel', en: 'Vienna Schnitzel', uk: 'Віденський шніцель' }}
          requiredDE
        />

        <LangTabs
          values={{ de: form.descriptionDE, en: form.descriptionEN, uk: form.descriptionUK }}
          onChange={(lang, value) =>
            setForm({
              ...form,
              descriptionEN: lang === 'en' ? value : form.descriptionEN,
              descriptionUK: lang === 'uk' ? value : form.descriptionUK,
            })
          }
          onDEChange={(v) => setForm({ ...form, descriptionDE: v })}
          label={t('description')}
          placeholder={{
            de: 'Klassisches Wiener Schnitzel...',
            en: 'Classic Vienna Schnitzel...',
            uk: 'Класичний віденський шніцель...',
          }}
          multiline
          requiredDE={false}
          rows={3}
        />
      </div>

      {/* Image */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6">
        <label className="text-sm font-medium text-gray-700 mb-1.5 block">
          {t('imageUrl')}
        </label>
        <input
          type="url"
          value={form.imageUrl}
          onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
          placeholder="https://..."
          className={inputClass}
        />
        <p className="text-xs text-gray-500 mt-1">{t('imageHint')}</p>
        {form.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={form.imageUrl}
            alt=""
            className="mt-3 w-32 h-32 rounded-lg object-cover bg-gray-100"
          />
        )}
      </div>

      {/* Price / Variants */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 space-y-4">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setHasVariants(false)}
            className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              !hasVariants
                ? 'bg-gray-900 text-white'
                : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
            }`}
          >
            {t('singlePrice')}
          </button>
          <button
            type="button"
            onClick={() => setHasVariants(true)}
            className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              hasVariants
                ? 'bg-gray-900 text-white'
                : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
            }`}
          >
            {t('multipleVariants')}
          </button>
        </div>

        {!hasVariants ? (
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1.5 block">
              {t('price')} (€) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              placeholder="12.50"
              required={!hasVariants}
              className={inputClass}
            />
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-gray-500">{t('variantsHint')}</p>
            {form.variants.map((v, idx) => (
              <div key={idx} className="border border-gray-200 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-700">
                    {t('variant')} {idx + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeVariant(idx)}
                    className="text-xs text-red-600 hover:underline"
                  >
                    {tCommon('delete')}
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    value={v.labelDE}
                    onChange={(e) => updateVariant(idx, 'labelDE', e.target.value)}
                    placeholder={`${t('variantLabel')} DE *`}
                    required
                    className={inputClass}
                  />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={v.price as string}
                    onChange={(e) => updateVariant(idx, 'price', e.target.value)}
                    placeholder="€"
                    required
                    className={inputClass}
                  />
                  <input
                    value={v.labelEN ?? ''}
                    onChange={(e) => updateVariant(idx, 'labelEN', e.target.value)}
                    placeholder={`${t('variantLabel')} EN`}
                    className={inputClass}
                  />
                  <input
                    value={v.labelUK ?? ''}
                    onChange={(e) => updateVariant(idx, 'labelUK', e.target.value)}
                    placeholder={`${t('variantLabel')} UK`}
                    className={inputClass}
                  />
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={addVariant}
              className="w-full border border-dashed border-gray-300 text-gray-600 text-sm py-2.5 rounded-lg hover:border-gray-400 hover:bg-gray-50"
            >
              + {t('addVariant')}
            </button>
          </div>
        )}
      </div>

      {/* Tags */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 space-y-4">
        <h3 className="text-sm font-medium text-gray-700">{t('tags')}</h3>

        <div className="flex flex-wrap gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isVegetarian}
              onChange={(e) => setForm({ ...form, isVegetarian: e.target.checked })}
              className="rounded border-gray-300"
            />
            <span className="text-sm text-gray-700">🌱 {t('vegetarian')}</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isVegan}
              onChange={(e) =>
                setForm({ ...form, isVegan: e.target.checked, isVegetarian: e.target.checked || form.isVegetarian })
              }
              className="rounded border-gray-300"
            />
            <span className="text-sm text-gray-700">🌿 {t('vegan')}</span>
          </label>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 mb-1.5 block">
            {t('spicyLevel')}
          </label>
          <div className="flex gap-2">
            {[0, 1, 2, 3].map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => setForm({ ...form, spicyLevel: lvl })}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  form.spicyLevel === lvl
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                }`}
              >
                {lvl === 0 ? t('notSpicy') : '🌶️'.repeat(lvl)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Allergens */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6">
        <h3 className="text-sm font-medium text-gray-700 mb-3">{t('allergens')}</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {ALLERGEN_LIST.map((key) => {
            const isChecked = form.allergens.includes(key)
            return (
              <label
                key={key}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-sm transition-colors ${
                  isChecked
                    ? 'border-gray-900 bg-gray-50'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggleAllergen(key)}
                  className="rounded border-gray-300"
                />
                <span className="text-xs font-bold text-gray-500">{ALLERGEN_CODES[key]}</span>
                <span className="text-gray-700 truncate">{tAllergens(key)}</span>
              </label>
            )
          })}
        </div>
      </div>

      {/* Available */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.isAvailable}
            onChange={(e) => setForm({ ...form, isAvailable: e.target.checked })}
            className="rounded border-gray-300"
          />
          <span className="text-sm text-gray-700">{t('isAvailable')}</span>
        </label>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex flex-col-reverse sm:flex-row gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="border border-gray-200 bg-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50"
        >
          {tCommon('cancel')}
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 sm:flex-initial bg-gray-900 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
        >
          {loading ? tCommon('saving') : tCommon('save')}
        </button>
      </div>
    </form>
  )
}

const inputClass =
  'w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent'
