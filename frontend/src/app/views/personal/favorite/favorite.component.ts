import {Component, OnInit} from '@angular/core';
import {FavoriteService} from "../../../shared/services/favorite.service";
import {FavoriteType} from "../../../../types/favorite.type";
import {DefaultResponseType} from "../../../../types/default-response.type";
import {environment} from "../../../../environments/environment";
import {CartType} from "../../../../types/cart.type";
import {CartService} from "../../../shared/services/cart.service";

@Component({
  selector: 'app-favorite',
  templateUrl: './favorite.component.html',
  styleUrls: ['./favorite.component.scss']
})
export class FavoriteComponent implements OnInit {
  products: FavoriteType[] = [];
  serverStaticPath = environment.serverStaticPath;
  productsInCart: CartType | null = null;
  count: number = 1;

  constructor(
    private favoriteService: FavoriteService,
    private cartService: CartService,
  ) {
  }

  ngOnInit(): void {
    this.cartService.getCart()
      .subscribe((cartData: CartType | DefaultResponseType) => {
        if ((cartData as DefaultResponseType).error !== undefined) {
          const error = (cartData as DefaultResponseType).message;
          throw new Error(error);
        }

        this.productsInCart = cartData as CartType;

        this.favoriteService.getFavorites()
          .subscribe((data: FavoriteType[] | DefaultResponseType) => {
            if ((data as DefaultResponseType).error !== undefined) {
              const error = (data as DefaultResponseType).message;
              throw new Error(error);
            }

            this.products = (data as FavoriteType[]).map((product: FavoriteType) => {
              if (this.productsInCart) {
                const productInCart = this.productsInCart.items.find(item => item.product.id === product.id);
                if (productInCart) {
                  product.inCart = true;
                  product.countInCart = productInCart.quantity;
                  this.updateCount(product.id, product.countInCart);
                }
              }
              return product;
            });
          });
      });
  }

  removeFromFavorites(id: string) {
    this.favoriteService.removeFavorite(id)
      .subscribe((data: DefaultResponseType) => {
        if (data.error) {
          throw new Error(data.message);
        }
        this.products = this.products.filter((item) => item.id !== id);
      })
  }

  addToCart(id: string) {
    this.cartService.updateCart(id, 1)
      .subscribe((data: CartType | DefaultResponseType) => {
        if ((data as DefaultResponseType).error !== undefined) {
          const error = (data as DefaultResponseType).message;
          throw new Error(error);
        }

        const productToCart: FavoriteType | undefined = this.products.find((product: FavoriteType) => product.id === id);
        if (productToCart) {
          productToCart.inCart = true;
          productToCart.countInCart = 1;
        }
      });
  }

  updateCount(id: string, value: number) {
    const product = this.products.find((product: FavoriteType) => product.id === id);
    if (product) {
      product.countInCart = value;
      this.cartService.updateCart(product.id, product.countInCart)
        .subscribe((data: CartType | DefaultResponseType) => {
          if ((data as DefaultResponseType).error !== undefined) {
            const error = (data as DefaultResponseType).message;
            throw new Error(error);
          }

          this.productsInCart = data as CartType;
          product.countInCart = this.productsInCart.items.find(item => item.product.id === product.id)?.quantity;
        });
    }
  }

  removeFromCart(id: string) {
    this.cartService.updateCart(id, 0)
      .subscribe((data: CartType | DefaultResponseType) => {
        if ((data as DefaultResponseType).error !== undefined) {
          throw new Error((data as DefaultResponseType).message);
        }
        const productToRemove = this.products.find(product => product.id === id);
        if (productToRemove) {
          productToRemove.countInCart = 0;
          productToRemove.inCart = false;
          this.count = 1;
        }
      });
  }


}
