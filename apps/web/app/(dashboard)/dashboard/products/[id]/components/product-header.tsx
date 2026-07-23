'use client';

import Image from 'next/image';
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
  Package,
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

import { useProductActions } from '../hooks/use-product-actions';

const STATUS_STYLES = {
  active: 'bg-green-500/10 text-green-600 hover:bg-green-500/20',
  draft: 'bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20',
  archived: 'bg-muted text-muted-foreground',
};

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
      <div className="flex flex-col gap-4 pb-6 border-b sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <Button
            render={<Link href="/dashboard/products" />}
            variant="ghost"
            size="icon"
            className="shrink-0 -ml-2 mt-0.5"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">{tCommon('back')}</span>
          </Button>

          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-muted">
            {image ? (
              <Image
                src={image}
                alt={product.name}
                fill
                className="object-cover"
                sizes="56px"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <Package className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight">
                {product.name}
              </h1>
              <Badge className={STATUS_STYLES[status]}>
                {t(`status.${status}`)}
              </Badge>
            </div>
            {product.categories.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {product.categories.map((category) => (
                  <Badge
                    key={category.id}
                    variant="secondary"
                    className="font-normal"
                  >
                    {category.name}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
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
