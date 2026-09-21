// Garde explicite : importer les services depuis un composant client doit
// échouer au build, avec un message clair. Le lint ne peut pas le vérifier,
// faute de savoir quel fichier porte `"use client"`. La garde existait déjà
// par transitivité (repositories, puis client DynamoDB, puis `env`), mais une
// garde qui dépend d'un détail d'implémentation trois niveaux plus bas finit
// toujours par disparaître.
import "server-only";

import { cartRepository } from "../repositories/cart.repository";
import { categoryRepository } from "../repositories/category.repository";
import { productRepository } from "../repositories/product.repository";
import { userRepository } from "../repositories/user.repository";
import { wishlistRepository } from "../repositories/wishlist.repository";

import { createCartService } from "./cart.service";
import { createProductService } from "./product.service";
import { createUserService } from "./user.service";
import { createWishlistService } from "./wishlist.service";

/**
 * Racine de composition des services.
 *
 * Les services ne connaissent que des contrats : ils reçoivent leurs
 * repositories en paramètre et n'importent jamais une implémentation. Le
 * branchement sur DynamoDB se fait ici, et uniquement ici.
 *
 * Ce n'est pas une préférence de style. Un service qui importe directement un
 * repository entraîne avec lui le client AWS, donc la validation des variables
 * d'environnement, donc l'impossibilité de tester un calcul de sous-total sans
 * configuration AWS. Le premier test écrit l'a montré immédiatement.
 *
 * C'est ce module que consomment les Server Actions et les routes API. Jamais
 * un composant.
 */

export const cartService = createCartService({ productRepository, cartRepository });

export const productService = createProductService({ productRepository, categoryRepository });

export const wishlistService = createWishlistService({
  productRepository,
  wishlistRepository,
  cartService,
});

export const userService = createUserService({ userRepository, cartService, wishlistService });
