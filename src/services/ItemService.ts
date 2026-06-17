'use server';

import { prisma } from '@/lib/prisma';

export async function getItemForPassport(itemId: string) {
  return prisma.item.findUnique({
    where: { id: itemId },
    select: {
      id: true,
      name: true,
      description: true,
      imageUrl: true,
      templateFields: true,
      ItemCategory: {
        include: {
          Category: { select: { id: true, name: true } }
        }
      },
      createdAt: true,
      updatedAt: true,
    },
  });
}

export async function getIssuesForItem(itemId: string) {
  return prisma.state.findMany({
    where: { itemId },
    select: {
      id: true,
      title: true,
      description: true,
      createdAt: true,
      imageUrls: true,
      templateConfig: true,
      evidenceID: true,
      backed: true,
      backedAt: true,
    },
  });
}

export async function getItemsByCategoryForPassport(categoryId: string) {
  return prisma.item.findMany({
    where: { 
      ItemCategory: { 
        some: { categoryId } 
      } 
    },
    select: {
      id: true,
      name: true,
      description: true,
      imageUrl: true,
      templateFields: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}


