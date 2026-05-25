import {Component, OnInit} from '@angular/core';
import {FormBuilder, Validators} from "@angular/forms";
import {AuthService} from "../../../core/auth/auth.service";
import {LoginResponseType} from "../../../../types/login-response.type";
import {DefaultResponseType} from "../../../../types/default-response.type";
import {HttpErrorResponse} from "@angular/common/http";
import {MatSnackBar} from "@angular/material/snack-bar";
import {Router} from "@angular/router";
import {CartService} from "../../../shared/services/cart.service";
import {CartType} from "../../../../types/cart.type";
import {forkJoin} from "rxjs";

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
    rememberMe: [false],
  });

  constructor(private fb: FormBuilder,
              private authService: AuthService,
              private _snackBar: MatSnackBar,
              private router: Router,
              private cartService: CartService,
  ) {
  }

  ngOnInit(): void {
  }

  login(): void {
    if (this.loginForm.valid && this.loginForm.value.email && this.loginForm.value.password) {

      this.cartService.getCart()
        .subscribe((guestCartData: CartType | DefaultResponseType) => {

          const guestCart = guestCartData as CartType;
          const guestItems = guestCart.items ? guestCart.items : [];

          this.authService.login(
            this.loginForm.value.email!,
            this.loginForm.value.password!,
            !!this.loginForm.value.rememberMe
          )
            .subscribe({
              next: (data: LoginResponseType | DefaultResponseType) => {
                let error = null;

                if ((data as DefaultResponseType).error !== undefined) {
                  error = (data as DefaultResponseType).message;
                }

                const loginResponse = data as LoginResponseType;

                if (!loginResponse.accessToken || !loginResponse.refreshToken || !loginResponse.userId) {
                  error = 'Ошибка при авторизации!';
                }

                if (error) {
                  this._snackBar.open(error);
                  throw new Error(error);
                }

                this.authService.setTokens(loginResponse.accessToken, loginResponse.refreshToken);
                this.authService.userId = loginResponse.userId;

                this.cartService.getCart()
                  .subscribe((userCartData: CartType | DefaultResponseType) => {

                    const userCart = userCartData as CartType;
                    const userItems = userCart.items ? userCart.items : [];

                    const requests = guestItems.map(guestItem => {
                      const userItem = userItems.find(item => item.product.id === guestItem.product.id);
                      const quantity = guestItem.quantity + (userItem ? userItem.quantity : 0);

                      return this.cartService.updateCart(guestItem.product.id, quantity);
                    });

                    if (requests.length) {
                      forkJoin(requests).subscribe(() => {
                        this.cartService.getCartCount().subscribe();
                        this._snackBar.open('Вы успешно авторизовались!');
                        this.router.navigate(['/']);
                      });
                    } else {
                      this.cartService.getCartCount().subscribe();
                      this._snackBar.open('Вы успешно авторизовались!');
                      this.router.navigate(['/']);
                    }

                  });
              },
              error: (errorResponse: HttpErrorResponse) => {
                if (errorResponse.error && errorResponse.error.message) {
                  this._snackBar.open(errorResponse.error.message);
                } else {
                  this._snackBar.open('Ошибка при авторизации!');
                }
              }
            });
        });
    }
  }
}
