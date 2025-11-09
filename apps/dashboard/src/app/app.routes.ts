import { Route } from '@angular/router';
import { authGuard } from './auth/auth.guard';

export const appRoutes: Route[] = [
	{
		path: '',
		pathMatch: 'full',
		redirectTo: 'home',
	},
	{
		path: 'home',
		canActivate: [authGuard],
		loadComponent: () =>
			import('./home/home.component').then((m) => m.HomeComponent),
	},
	{
		path: 'login',
		loadComponent: () =>
			import('./auth/login.component').then((m) => m.LoginComponent),
	},
	{
		path: '**',
		redirectTo: 'home',
	},
];
