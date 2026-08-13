'use client';

import Link from 'next/link';

import { useTranslations } from 'next-intl';
import {
  Archive,
  ArrowLeft,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  MoreHorizontal,
  Pencil,
  Trash2,
} from 'lucide-react';

import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@louez/ui';

import { ProductImage } from '@/components/product/product-image';

import { useProductActions } from '../hooks/use-product-actions';

const STATUS_VARIANTS = {
  active: 'success',
  draft: 'pending',
  archived: 'expired',
} as const

interface ProductHeaderProps {
  product: {
    id: string;
    name: string;
    images: string[] | null;
    status: 'draft' | 'active' | 'archived' | null;
    categories: Array<{ id: string; name: string }>;
  };
  storeSlug: string;
}

export function ProductHeader({ product, storeSlug }: ProductHeaderProps) {
  const t = useTranslations('dashboard.products');
  const tDetail = useTranslations('dashboard.products.detail');
  const tCommon = useTranslations('common');

  const {
    isLoading,
    deleteDialogOpen,
    setDeleteDialogOpen,
    handleStatusToggle,
    handleArchive,
    handleDuplicate,
    requestDelete,
    handleDelete,
  } = useProductActions();

  const status = product.status || 'draft';
  const image = product.images?.[0];

  return (
    <>
      <div className="flex flex-col gap-3 pb-4 border-b sm:flex-row sm:items-start sm:justify-between sm:gap-4 sm:pb-6">
        <div className="flex min-w-0 items-start gap-2 sm:gap-3">
          <Button
            render={<Link href="/dashboard/products" />}
            variant="ghost"
            size="icon"
            className="shrink-0 -ml-2 mt-0.5"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">{tCommon('back')}</span>
          </Button>

          <ProductImage
            src={image}
            alt={product.name}
            sizes="56px"
            containerClassName="aspect-square size-11 shrink-0 sm:size-14"
          />

          <div className="min-w-0 flex-1 space-y-1.5">
            <h1 className="text-lg font-bold tracking-tight wrap-break-word sm:text-2xl">
              {product.name}
            </h1>
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant={STATUS_VARIANTS[status]}>{t(`status.${status}`)}</Badge>
              {product.categories.map((category) => (
                <Badge key={category.id} variant="expired" className="font-normal">
                  {category.name}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:shrink-0">
          <Button
            className="flex-1 sm:flex-none"
            render={<Link href={`/dashboard/products/${product.id}/edit`} />}
          >
            <Pencil className="h-4 w-4 mr-2" />
            {tCommon('edit')}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="outline" size="icon" disabled={isLoading} />
              }
            >
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">{tCommon('actions')}</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                render={
                  <Link href={`/dashboard/products/${product.id}/edit`} />
                }
              >
                <Pencil className="mr-2 h-4 w-4" />
                {tCommon('edit')}
              </DropdownMenuItem>
              {status === 'active' && (
                <DropdownMenuItem
                  onClick={() =>
                    window.open(`/${storeSlug}/product/${product.id}`, '_blank')
                  }
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  {tDetail('viewOnStorefront')}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => handleDuplicate(product)}>
                <Copy className="mr-2 h-4 w-4" />
                {t('duplicate')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleStatusToggle(product)}>
                {status === 'active' ? (
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
              {status !== 'archived' && (
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
        </div>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteConfirm.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteConfirm.description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogClose render={<Button variant="outline" />}>
              {tCommon('cancel')}
            </AlertDialogClose>
            <AlertDialogClose
              render={<Button variant="destructive" />}
              onClick={() =>
                handleDelete({ redirectTo: '/dashboard/products' })
              }
            >
              {tCommon('delete')}
            </AlertDialogClose>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
