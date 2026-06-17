import { NextRequest, NextResponse } from 'next/server';
import { validateApiToken } from '@/lib/auth/api-tokens/middleware';
import { attachItemToCategory, detachItemFromCategory } from '@/actions/categories';

/**
 * @swagger
 * /categories/{id}/products/{productId}:
 *   post:
 *     summary: Attach a product to a category
 *     description: Adds a product to a category. Requires a valid API token.
 *     tags:
 *       - Categories
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Unique identifier of the category
 *         example: category-001
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *         description: Unique identifier of the product
 *         example: PRODUCT-001
 *     responses:
 *       '200':
 *         description: Product attached to category successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *       '401':
 *         description: Unauthorized - invalid or missing API token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                 code:
 *                   type: string
 *       '404':
 *         description: Category or product not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       '500':
 *         description: Internal server error
 *   delete:
 *     summary: Detach a product from a category
 *     description: Removes a product from a category. Requires a valid API token.
 *     tags:
 *       - Categories
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Unique identifier of the category
 *         example: category-001
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *         description: Unique identifier of the product
 *         example: PRODUCT-001
 *     responses:
 *       '200':
 *         description: Product detached from category successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *       '401':
 *         description: Unauthorized - invalid or missing API token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                 code:
 *                   type: string
 *       '404':
 *         description: Category or product not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       '500':
 *         description: Internal server error
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; productId: string }> }
) {
  try {
    const auth = await validateApiToken(request);
    if (!auth) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'INVALID_TOKEN' },
        { status: 401 }
      );
    }

    const { id: categoryId, productId } = await params;
    await attachItemToCategory(categoryId, productId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error attaching product to category:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error al añadir producto a la categoría';
    return NextResponse.json(
      { error: errorMessage },
      { status: errorMessage.includes('no encontrada') || errorMessage.includes('not found') ? 404 : 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; productId: string }> }
) {
  try {
    const auth = await validateApiToken(request);
    if (!auth) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'INVALID_TOKEN' },
        { status: 401 }
      );
    }

    const { id: categoryId, productId } = await params;
    await detachItemFromCategory(categoryId, productId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error detaching product from category:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error al remover producto de la categoría';
    return NextResponse.json(
      { error: errorMessage },
      { status: errorMessage.includes('no encontrada') || errorMessage.includes('not found') ? 404 : 500 }
    );
  }
}
