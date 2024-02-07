import { Component } from '@angular/core';
import { Observable } from "rxjs";
import { of } from 'rxjs';
import { BauobjektService } from "./bauobjekt.service";
import { Bauobjekt } from "./bauobjekt.service";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})

export class AppComponent {

   editBauobj: Bauobjekt | undefined;
   selectedbwk: String = "";
   
   constructor(public bauobjektService: BauobjektService)
   {}

	onButtonClickRefresh(): void {
	  this.bauobjektService.getBauobjekte();
	}

  onButtonClickNew(): void {
	  
	  this.editBauobj = { id: -1 } as Bauobjekt;
	  if (this.editBauobj !== undefined)
	  {	
		this.bauobjektService.bauwerkKomponente$ = {} as Observable<any>;
	  }
  }
  
  onButtonClickEdit() : void {
	  if (this.editBauobj !== undefined)
	  {
		  if (this.editBauobj.id == -1)
			  this.bauobjektService.addBauobjekt(this.editBauobj);
		  else
			this.bauobjektService.editBauobjekt(this.editBauobj);
				
		this.editBauobj = undefined;
	  }
  }
  
  onButtonClickDel() : void {
	  if (this.editBauobj !== undefined)
	  {
		this.bauobjektService.delBauobjekt(this.editBauobj.id);
		this.editBauobj = undefined;
	  }
  }
  
  onButtonClickSelect(id: number) : void {
	this.editBauobj = undefined;
	
	this.bauobjektService.getBauobjekt(id).subscribe((r: Bauobjekt) => {
			this.editBauobj = r;
			this.bauobjektService.getBauwerkKomponente(r.id);
		});
  }

  
  onButtonClickCancel(): void {
	if (this.editBauobj !== undefined)
	  this.editBauobj = undefined;
  }

   OnBauwerkKomponenteRemove(bwk: string): void {
	  if (this.editBauobj !== undefined)
		this.bauobjektService.delBauwerkKomponente(this.editBauobj.id, bwk);
  }

	public onOptionsSelectedBwk(event : any) {
	   const value = event.target.value;
	   this.selectedbwk = value;

	  if (this.editBauobj !== undefined)
		this.bauobjektService.addBauwerkKomponente(this.editBauobj.id, value);
	}
}
