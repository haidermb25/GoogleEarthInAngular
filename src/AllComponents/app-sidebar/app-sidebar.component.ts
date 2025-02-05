import { isNgTemplate } from '@angular/compiler';
import { FolderServiceService } from './../../app/Shared/FolderService.service';
import { Component, OnInit, HostListener,ChangeDetectorRef  } from '@angular/core';
import { debug } from 'console';
@Component({
  selector: 'app-sidebar',
  templateUrl: './app-sidebar.component.html',
  styleUrls: ['./app-sidebar.component.css']
})
export class AppSidebarComponent implements OnInit {

  isContextMenuVisible = false;
  contextMenuStyle = {};
  folderStructure:any[] = [];
  itemName: string | null = null;
  newFolderName:string|null='Main Folder';
  itemtype:string|null=null;
  newFileName:string|null=null;
  constructor(private FolderService:FolderServiceService,private cdr:ChangeDetectorRef) { }

  ngOnInit(): void {
    this.folderStructure=this.FolderService.folderStructure;
    console.log("Folder Structure",this.folderStructure);
  }

  FolderToggle(folder: any) {
    folder.isOpen = !folder.isOpen;
  }

  openContextMenu(event: MouseEvent, folder: any,type:string|null): void {
    this.itemtype=type;
    this.itemName=folder.name;
    event.preventDefault();
    const contextMenuWidth = 200; // Adjust based on the actual width
    const contextMenuHeight = 100; // Adjust based on the actual height

    const { clientX, clientY } = event;

    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    let top = clientY;
    let left = clientX;

    // Adjust if context menu goes out of bounds
    if (clientX + contextMenuWidth > windowWidth) {
      left = clientX - contextMenuWidth;
    }
    if (clientY + contextMenuHeight > windowHeight) {
      top = clientY - contextMenuHeight;
    }

    this.contextMenuStyle = {
      top: `${top}px`,
      left: `${left+80}px`,
    };
    this.isContextMenuVisible = true;
  }


  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    this.isContextMenuVisible = false;
  }

  saveName(folder: any) {
    if (!folder.isediting) return; // Prevent duplicate calls
    folder.isediting = false;
    this.RenameItem();
  }


  MakeEditable() {
    const findFolder = (folders: any[]): any => {
      for (const folder of folders) {
        if (folder.name === this.itemName) {
          return folder;
        }
        if (folder.children) {
          const found = findFolder(folder.children);
          if (found) {
            return found;
          }
        }
      }
      return null;
    };

    const folder = findFolder(this.folderStructure);
    if (folder) {
      folder.isediting = true;
    }
  }

  RenameItem() {
    if(this.itemtype=="Folder"){
      if(this.FolderService.updateFileName(this.itemName,this.newFolderName)==false){
        this.newFolderName=this.itemName;
      }
    }
    else{

      if(this.FolderService.updateFileName(this.itemName,this.newFileName)==false){
        this.newFileName=this.itemName;
      }
    }
  }

  DeleteItem() {
    if(this.itemtype=="Folder"){
      alert("You cannot delete main folder");
    }
    else{
      this.FolderService.deleteFile(this.itemName);
      this.isContextMenuVisible = false;
    }
  }

  /**
   * Handles the checkbox change event for a folder.
   * Updates the checked status of the folder and its children.
   */
  onFolderCheckboxChange(folder: any) {
    folder.checked = folder.checked;
    const updateChildren = (children: any[], checked: boolean) => {
      for (const child of children) {
        child.checked = checked;
        this.FolderService.setMapForFile(child.name, checked);
        if (child.children) {
          updateChildren(child.children, checked);
        }
      }
    };

    if (folder.children) {
      updateChildren(folder.children, folder.checked);
    }
    this.FolderService.setMapForFile(folder.name, folder.checked);
  }

  /**
   * Updates the checked status of a folder and its children.
   */
  updateFolderAndChildrenCheckStatus(folder: any, checked: boolean) {
    const updateChildren = (children: any[], checked: boolean) => {
      for (const child of children) {
        child.checked = checked;
        this.FolderService.setMapForFile(child.name, checked);
        if (child.children) {
          updateChildren(child.children, checked);
        }
      }
    };

    folder.checked = checked;
    this.FolderService.setMapForFile(folder.name, checked);

    if (folder.children) {
      updateChildren(folder.children, checked);
    }
  }

  /**
   * Handles the checkbox change event for an item.
   * Updates the checked status of the item, its parent, and its children.
   */
  onItemCheckboxChange(item: any, parent: any) {
    item.checked = item.checked;

    const updateParentCheckStatus = (parent: any) => {
      if (!parent) return;

      const allSiblingsChecked = parent.children.every((child: any) => child.checked);

      if (allSiblingsChecked) {
        parent.checked = true;
      } else {
        parent.checked = false;
      }

      this.FolderService.setMapForFile(parent.name, parent.checked);
      updateParentCheckStatus(parent.parent);
    };

    const updateChildrenCheckStatus = (children: any[], checked: boolean) => {
      for (const child of children) {
        child.checked = checked;
        this.FolderService.setMapForFile(child.name, checked);
        if (child.children) {
          updateChildrenCheckStatus(child.children, checked);
        }
      }
    };

    if (item.children) {
      updateChildrenCheckStatus(item.children, item.checked);
    }

    this.FolderService.setMapForFile(item.name, item.checked);
    updateParentCheckStatus(parent);
  }

  /*Save the File here*/
  SaveFile(){
    this.FolderService.saveFile();
  }

  /*Get the Fill Color*/
  getFillColor(item:any):string{
   const polygon = this.FolderService.Polygons.find((poly: any) => poly.name === item.name);
   if(polygon!=null){
      return polygon ? polygon.fillColor : null;
   }
   const polyline=this.FolderService.Polylines.find((poly: any) => poly.name === item.name);
   if(polyline!=null){
      return "blue"
   }
   const point=this.FolderService.Points.find((poly: any) => poly.name === item.name);
   if(point!=null){
      return "red"
   }
   else{
      return "black"
   }
  }

  CreateNewFile(){
    /*Clear all previous things*/
   this.FolderService.clearMap()
  }

  updateMap(kmldata:string){
        this.FolderService.parseKMLData(kmldata);
        this.cdr.detectChanges()
  }

  triggerInputFunction(): void {
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

    if (fileInput) {
      fileInput.value = '';
      fileInput.click();
    }
  }


  // Handle file selection and parse KML file
  onFileChange(event: any): void {
    const file = event.target.files[0];

    if (file) {
      if (file.type !== 'application/vnd.google-earth.kml+xml') {
        alert('Please select a valid KML file.');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e: any) => {
        const kmlData = e.target.result;
        console.log('KML Data:', kmlData);
        this.updateMap(kmlData)
      };

      reader.readAsText(file);
    }
  }
}
