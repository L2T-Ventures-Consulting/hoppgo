import { getTranslations } from 'next-intl/server'
import { db } from '@louez/db'
import { getCurrentStore } from '@/lib/store-context'
import { categories, productCategories } from '@louez/db'
import { eq, count } from 'drizzle-orm'
import { redirect } from 'next/navigation'

import { CategoryManager } from '@/components/categories/category-manager'

async function getCategoriesWithCount(storeId: string) {
  const categoriesList = await db.query.categories.findMany({
    where: eq(categories.storeId, storeId),
    orderBy: [categories.order],
  })

  // Get product count for each category
  const counts = await db
    .select({ categoryId: productCategories.categoryId, count: count() })
    .from(productCategories)
    .innerJoin(categories, eq(productCategories.categoryId, categories.id))
    .where(eq(categories.storeId, storeId))
    .groupBy(productCategories.categoryId)
  const countByCategory = new Map(counts.map((row) => [row.categoryId, row.count]))

  return categoriesList.map((category) => ({
    ...category,
    productCount: countByCategory.get(category.id) ?? 0,
  }))
}

export default async function CategoriesPage() {
  const store = await getCurrentStore()

  if (!store) {
    redirect('/onboarding')
  }

  const categoriesList = await getCategoriesWithCount(store.id)
  const t = await getTranslations('categories')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
        <p className="text-muted-foreground">{t('description')}</p>
      </div>

      <CategoryManager initialCategories={categoriesList} />
    </div>
  )
}
