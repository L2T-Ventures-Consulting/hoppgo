'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { MoreHorizontal, Pencil, Copy, Archive, Trash2, Eye, EyeOff, Package } from 'lucide-react'

import { Button } from '@louez/ui'
import { Badge } from '@louez/ui'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@louez/ui'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@louez/ui'
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@louez/ui'

import { getCurrencySymbol } from '@louez/utils'

import { ProductImage } from '@/components/product/product-image'

import { useProductActions } from './[id]/hooks/use-product-actions'

interface Product {
  id: string
  name: string
  images: string[] | null
  price: string
  deposit: string | null
  quantity: number
  status: 'draft' | 'active' | 'archived' | null
  category: {
    id: string
    name: string
  } | null
}

interface ProductsTableProps {
  products: Product[]
  currency?: string
}

const STATUS_VARIANTS = {
  active: 'success',
  draft: 'pending',
  archived: 'expired',
} as const

export function ProductsTable({ products, currency = 'EUR' }: ProductsTableProps) {
  const t = useTranslations('dashboard.products')
  const tCommon = useTranslations('common')
  const currencySymbol = getCurrencySymbol(currency)

  const {
    isLoading,
    deleteDialogOpen,
    setDeleteDialogOpen,
    handleStatusToggle,
    handleArchive,
    handleDuplicate,
    requestDelete,
    handleDelete,
  } = useProductActions()

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
        <Package className="h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-semibold">{t('noProducts')}</h3>
        <p className="mt-2 text-sm text-muted-foreground">{t('noProductsDescription')}</p>
        <Button render={<Link href="/dashboard/products/new" />} className="mt-4">
          {t('addProduct')}
        </Button>
      </div>
    )
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">{t('images')}</TableHead>
              <TableHead>{t('name')}</TableHead>
              <TableHead>{t('category')}</TableHead>
              <TableHead className="text-right">{t('price')}</TableHead>
              <TableHead className="text-center">{t('quantity')}</TableHead>
              <TableHead>{tCommon('status')}</TableHead>
              <TableHead className="w-[70px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => {
              const statusVariant = STATUS_VARIANTS[product.status || 'draft']

              return (
                <TableRow key={product.id}>
                  <TableCell>
                    <ProductImage
                      src={product.images?.[0]}
                      alt={product.name}
                      sizes="64px"
                      containerClassName="h-12 shrink-0"
                    />
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/dashboard/products/${product.id}`}
                      className="font-medium hover:underline"
                    >
                      {product.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {product.category?.name || '-'}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {parseFloat(product.price).toFixed(2)} {currencySymbol}
                  </TableCell>
                  <TableCell className="text-center">{product.quantity}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant}>
                      {t(`status.${product.status || 'draft'}`)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={<Button variant="ghost" size="icon" disabled={isLoading} />}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">{tCommon('actions')}</span>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          render={<Link href={`/dashboard/products/${product.id}/edit`} />}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          {tCommon('edit')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDuplicate(product)}>
                          <Copy className="mr-2 h-4 w-4" />
                          {t('duplicate')}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleStatusToggle(product)}>
                          {product.status === 'active' ? (
                            <>
                              <EyeOff className="mr-2 h-4 w-4" />
                              {t('unpublish')}
                            </>
                          ) : (
                            <>
                              <Eye className="mr-2 h-4 w-4" />
                              {t('publish')}
                            </>
                          )}
                        </DropdownMenuItem>
                        {product.status !== 'archived' && (
                          <DropdownMenuItem onClick={() => handleArchive(product)}>
                            <Archive className="mr-2 h-4 w-4" />
                            {t('archive')}
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => requestDelete(product)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          {tCommon('delete')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteConfirm.title')}</AlertDialogTitle>
            <AlertDialogDescription>{t('deleteConfirm.description')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogClose render={<Button variant="outline" />}>
              {tCommon('cancel')}
            </AlertDialogClose>
            <AlertDialogClose
              render={<Button variant="destructive" />}
              onClick={() => handleDelete()}
            >
              {tCommon('delete')}
            </AlertDialogClose>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
