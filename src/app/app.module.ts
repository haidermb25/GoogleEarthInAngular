import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { AppGoogleMapComponent } from 'src/AllComponents/app-google-map/app-google-map.component';
import { AppSidebarComponent } from 'src/AllComponents/app-sidebar/app-sidebar.component';
import { FormsModule } from '@angular/forms';

@NgModule({
  declarations: [
    AppComponent,
    AppGoogleMapComponent,
    AppSidebarComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
