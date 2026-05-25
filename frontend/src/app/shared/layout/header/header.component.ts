import {Component, HostListener, Input, OnInit} from '@angular/core';
import {AuthService} from "../../../core/auth/auth.service";
import {MatSnackBar} from "@angular/material/snack-bar";
import {Router} from "@angular/router";
import {CategoryWithTypeType} from "../../../../types/category-with-type.type";
import {CartService} from "../../services/cart.service";
import {ProductService} from "../../services/product.service";
import {ProductType} from "../../../../types/product.type";
import {environment} from "../../../../environments/environment";
import {FormControl} from "@angular/forms";
import {debounceTime, forkJoin} from "rxjs";
import {CartType} from "../../../../types/cart.type";
import {DefaultResponseType} from "../../../../types/default-response.type";

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit {
  @Input() categories: CategoryWithTypeType[] = [];

  serverStaticPath = environment.serverStaticPath;
  isLogged: boolean = false;
  count: number = 0;
  products: ProductType[] = [];
  showedSearch: boolean = false;

  searchField = new FormControl();

  constructor(private authService: AuthService,
              private _snackBar: MatSnackBar,
              private router: Router,
              private cartService: CartService,
              private productService: ProductService,
  ) {
    this.isLogged = this.authService.getIsLoggedIn();
  }

  ngOnInit(): void {

    this.searchField.valueChanges
      .pipe(debounceTime(500))
      .subscribe(value => {

        if (value && value.length > 2) {

          this.productService.searchProducts(value)
            .subscribe((data: ProductType[]) => {
              this.products = data;
              this.showedSearch = true;
            });

        } else {
          this.products = [];
          this.showedSearch = false;
        }

      });

    this.authService.isLogged$.subscribe((isLoggedIn: boolean) => {
      this.isLogged = isLoggedIn;
      this.cartService.getCartCount().subscribe();
    });

    this.cartService.getCartCount().subscribe();

    this.cartService.count$.subscribe((count: number) => {
      this.count = count;
    });

  }

  logout(): void {
    this.authService.logout()
      .subscribe({
        next: () => {
          this.doLogout();
        },
        error: () => {
          this.doLogout();
        }
      });
  }

  doLogout(): void {

    this.authService.removeTokens();
    this.authService.userId = null;

    this.cartService.getCart()
      .subscribe((data: CartType | DefaultResponseType) => {

        const cart = data as CartType;

        if (cart.items && cart.items.length) {

          const requests = cart.items.map(item => {
            return this.cartService.updateCart(item.product.id, 0);
          });

          forkJoin(requests)
            .subscribe(() => {
              this.cartService.setCount(0);
            });

        } else {
          this.cartService.setCount(0);
        }

      });

    this._snackBar.open('Вы успешно вышли из системы!');
    this.router.navigate(['/']);

  }

  selectProduct(url: string) {
    this.router.navigate(['/product/' + url]);

    this.searchField.setValue('');
    this.products = [];
    this.showedSearch = false;
  }

  @HostListener('document:click', ['$event'])
  click(event: Event) {

    if (
      this.showedSearch &&
      (event.target as HTMLElement).className.indexOf('search-product') === -1
    ) {
      this.showedSearch = false;
    }

  }

}
