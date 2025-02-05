import { FolderServiceService } from './../../app/Shared/FolderService.service';
import { Component, AfterViewInit, HostListener,ChangeDetectorRef } from '@angular/core';

declare const google: any;

@Component({
  selector: 'app-google-map',
  templateUrl: './app-google-map.component.html',
  styleUrls: ['./app-google-map.component.css']
})
export class AppGoogleMapComponent implements AfterViewInit {
  drawingManager: any;
  map: any;
  NewName: string | null = null;
  selectedItem: any = null;
  isPolygonClicked: boolean = false;
  activeOption:String='color';
  polygonName:string|null='';
  fillColor: string = '#000000';
  strokeColor:string='#000000';
  isContextMenuVisible = false;
  contextMenuStyle = {};
  shapeType:string|null=null;
  areaBoxVisibility:Boolean=false
  perimeterResult:number=0
  areaResult:number=0
  perimeterUnit:string=""
  areaUnit:string=""

  constructor(private FolderService: FolderServiceService,private cdr:ChangeDetectorRef) {}


  ngOnInit(): void {
    // Subscribe to the context menu event from the service
    this.FolderService.contextMenuEvent.subscribe((data) => {
      const { event, overlay,name } = data;
      this.openContextMenu(event);
      const polygon = this.FolderService.Polygons.find(p => p.name === name);
      if (polygon) {
        this.polygonName = polygon.name;
        this.isContextMenuVisible = true;
      }
    });
    }


    ngAfterViewInit(): void {
      this.loadGoogleMapsScript()
        .then(() => {
          this.initMap();
        })
        .catch((error) => {
          console.error('Google Maps script loading error: ', error);
        });
    }

    loadGoogleMapsScript(): Promise<void> {
      return new Promise((resolve, reject) => {
        if (typeof google === 'undefined') {
          const script = document.createElement('script');
          script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyB9irjntPHdEJf024h7H_XKpS11OeW1Nh8&libraries=drawing&callback=initMap`;
          script.async = true;
          script.defer = true;
          script.onload = () => resolve();
          script.onerror = reject;
          document.body.appendChild(script);
        } else {
          resolve();
        }
      });
    }

    initMap(): void {
      this.map = new google.maps.Map(document.getElementById('map') as HTMLElement, {
        center: { lat: 37.7749, lng: -122.4194 },
        zoom: 12,
      });
      this.FolderService.getMapValue(this.map)
      this.drawingManager = new google.maps.drawing.DrawingManager({
        drawingMode: null,
        drawingControl: true,
        drawingControlOptions: {
          position: google.maps.ControlPosition.TOP_CENTER,
          drawingModes: ["marker", "polyline", "polygon"],
        },
        markerOptions: {
          draggable: true,
        },
        polylineOptions: {
          strokeColor: "#0000FF",
          strokeWeight: 2,
        },
        polygonOptions: {
          fillColor: "#00FF00",
          fillOpacity: 0.5,
          strokeColor: "#0000FF",
          strokeWeight: 2,
        },
      });

      this.drawingManager.setMap(this.map);

      google.maps.event.addListener(this.drawingManager, 'overlaycomplete', (event: any) => {
        let shapeName: string | null = null;
        let shapeList: any[] = [];

        if (event.type === 'marker') {
          shapeName = prompt("Enter the name of the marker");
          if (shapeName === null) {
            event.overlay.setMap(null);
            return;
          }
          if (!shapeName) {
            shapeName = `Marker_${this.FolderService.Points.length + 1}`;
          }
          shapeList = this.FolderService.Points;
          this.shapeType="point";
        }
        else if (event.type === 'polyline') {
          shapeName = prompt("Enter the name of the polyline");
          if (shapeName === null) {
            event.overlay.setMap(null);
            return;
          }
          if (!shapeName) {
            shapeName = `Polyline_${this.FolderService.Polylines.length + 1}`;
          }
          shapeList = this.FolderService.Polylines;
          this.shapeType="polyline"
        }
        else if (event.type === 'polygon') {
          shapeName = prompt("Enter the name of the polygon");
          if (shapeName === null) {
            event.overlay.setMap(null);
            return;
          }
          if (!shapeName) {
            shapeName = `Polygon_${this.FolderService.Polygons.length + 1}`;
          }
          shapeList = this.FolderService.Polygons;
          this.shapeType="polygon"
        }

        // Ensure the name is unique across all shapes
        const isDuplicate = this.FolderService.Points.some(p => p.name === shapeName) ||
                            this.FolderService.Polylines.some(p => p.name === shapeName) ||
                            this.FolderService.Polygons.some(p => p.name === shapeName);

        if (isDuplicate) {
          alert("Shape name must be unique across all types (Markers, Polylines, and Polygons).");
          event.overlay.setMap(null);
          return;
        }

        // Ensure the name does not match any folder name
        const isFolderName = this.FolderService.folderStructure.some(f => f.name === shapeName);
        if (isFolderName) {
          alert("Shape name cannot match an existing folder name.");
          event.overlay.setMap(null);
          return;
        }

        if (event.type === 'marker') {
          this.FolderService.Points.push({ name: shapeName, position: event.overlay.getPosition().toJSON(), overlay: event.overlay });
        }
        else if (event.type === 'polyline') {
          const path = event.overlay.getPath();
          const coordinates = [];
          for (let i = 0; i < path.getLength(); i++) {
            coordinates.push(path.getAt(i).toJSON());
          }
          this.FolderService.Polylines.push({ name: shapeName, position: coordinates, strokeColor: event.overlay.strokeColor, overlay: event.overlay });
        }
        else if (event.type === 'polygon') {
          const path = event.overlay.getPath();
          const coordinates = [];
          for (let i = 0; i < path.getLength(); i++) {
            coordinates.push(path.getAt(i).toJSON());
          }
          this.FolderService.Polygons.push({
            name: shapeName,
            position: coordinates,
            fillColor: event.overlay.fillColor,
            strokeColor: event.overlay.strokeColor,
            overlay: event.overlay
          });

          // Add a right-click event to show context menu
          google.maps.event.addListener(event.overlay, 'rightclick', (e: any) => {
            if (e.domEvent) {
              e.domEvent.preventDefault();
              e.domEvent.stopPropagation();
              this.openContextMenu(e.domEvent);
              const polygon = this.FolderService.Polygons.find(p => p.overlay === event.overlay);
              if (polygon) {
                this.polygonName = polygon.name;
                this.isContextMenuVisible = true;
              }
              this.cdr.detectChanges();
            }
          });
        }

        this.FolderService.updateFolderStructure(shapeName,this.shapeType);
      });
  }



    openContextMenu(event: MouseEvent): void {
          console.log('Right-click event:', event);
          event.preventDefault();
          event.stopPropagation();

          const contextMenuWidth = 200;
          const contextMenuHeight = 100;

          // Get map container position to calculate correct left offset
          const mapElement = document.getElementById('map');
          if (!mapElement) return;

          const rect = mapElement.getBoundingClientRect(); // Get map's position
          const { clientX, clientY } = event;
          const windowWidth = window.innerWidth;
          const windowHeight = window.innerHeight;

          let top = clientY;
          let left = clientX - rect.left; // Adjust left relative to the map

          // Prevent context menu from overflowing screen boundaries
          if (left + contextMenuWidth > rect.width) {
              left = rect.width - contextMenuWidth;
          }
          if (clientY + contextMenuHeight > windowHeight) {
              top = clientY - contextMenuHeight;
          }

          this.contextMenuStyle = {
              top: `${top}px`,
              left: `${left}px`,
          };

          console.log('Updated context menu position:', this.contextMenuStyle);
          this.isContextMenuVisible = true;
    }


    changePolygonColor(name: string|null, fillColor: string, strokeColor: string) {
      const polygon = this.FolderService.Polygons.find(p => p.name === name);
      if (polygon) {
        polygon.fillColor = fillColor;
        polygon.strokeColor = strokeColor;
        const overlay = polygon.overlay;
        if (overlay) {
          overlay.setOptions({ fillColor: fillColor, strokeColor: strokeColor });
          this.closeOptionsBox();
        }
      }
      console.log("Changed Polygon Color: ",polygon)
    }
    renameItem() {
      if (this.polygonName) {
        const polygon = this.FolderService.Polygons.find(p => p.name === this.polygonName);
        if (polygon) {
          this.FolderService.updateFileName(this.polygonName, this.NewName);
          polygon.name = this.NewName; // Update the polygon's name in the array
          this.polygonName = this.NewName;
        }
        this.NewName = "";
      }
    }

    deleteItem() {
      if (this.polygonName) {
          this.FolderService.deleteFile(this.polygonName);
          this.closeOptionsBox();
      }
    }



    closeOptionsBox() {
      this.isPolygonClicked = false;
    }


    setActiveOption(option:string){
      this.activeOption=option;
    }



    @HostListener('document:click', ['$event'])
    onDocumentClick(event: MouseEvent) {
      if (this.isContextMenuVisible) {
        this.isContextMenuVisible = false;
      }
    }

    @HostListener('document:contextmenu', ['$event'])
    onDocumentRightClick(event: MouseEvent) {
        event.preventDefault();
    }



    showArea() {
      debugger
      this.areaBoxVisibility = true;

      // Find the polygon by name in the Polygons array
      const polygon = this.FolderService.Polygons.find(p => p.name === this.polygonName);

      if (polygon) {
        const areaInKm=this.FolderService.calculateArea(polygon.position)
        const perimInkm=this.FolderService.calculatePerimeter(polygon.position)
      } else {
        console.log('Polygon not found');
      }
    }



    AreaCalculation(type: string) {
      // Find the polygon by name in the Polygons array
      const polygon = this.FolderService.Polygons.find(p => p.name === this.polygonName);

      if (polygon) {
        if (type === 'area') {
          // Calculate the area in square kilometers
          const areaInSqKm = this.FolderService.calculateArea(polygon.position);

          // Convert the area based on the selected unit
          switch (this.areaUnit) {
            case 'squareMeters':
              this.areaResult = this.FolderService.convertToSquareMeters(areaInSqKm);
              break;
            case 'squareFeet':
              this.areaResult = this.FolderService.convertToSquareFeet(areaInSqKm);
              break;
            case 'squareMiles':
              this.areaResult = this.FolderService.convertToSquareMiles(areaInSqKm);
              break;
            case 'squareYards':
              this.areaResult = this.FolderService.convertToSquareYards(areaInSqKm);
              break;
            case 'squareKilometers':
              this.areaResult = areaInSqKm; // No conversion needed for square kilometers
              break;
            default:
              console.log('Invalid area unit selected');
              break;
          }
        }

        if (type === 'perimeter') {
          // Calculate the perimeter in kilometers
          const perimeterInKm = this.FolderService.calculatePerimeter(polygon.position);

          // Convert the perimeter based on the selected unit
          switch (this.perimeterUnit) {
            case 'Centimeters':
              this.perimeterResult = this.FolderService.convertToCentimeters(perimeterInKm);
              break;
            case 'Meters':
              this.perimeterResult = this.FolderService.convertToMeters(perimeterInKm);
              break;
            case 'Kilometers':
              this.perimeterResult = this.FolderService.convertToKilometers(perimeterInKm);
              break;
            case 'Inches':
              this.perimeterResult = this.FolderService.convertToInches(perimeterInKm);
              break;
            case 'Feet':
              this.perimeterResult = this.FolderService.convertToFeet(perimeterInKm);
              break;
            case 'Yards':
              this.perimeterResult = this.FolderService.convertToYards(perimeterInKm);
              break;
            case 'Miles':
              this.perimeterResult = this.FolderService.convertToMiles(perimeterInKm);
              break;
            case 'Degrees':
              this.perimeterResult = this.FolderService.convertToDegrees(perimeterInKm);
              break;
            default:
              console.log('Invalid perimeter unit selected');
              break;
          }
        }
      } else {
        console.log('Polygon not found');
      }
    }

    closeAreaBox(){
      this.areaBoxVisibility=false;
      this.perimeterResult=0;
      this.areaResult=0;
      this.perimeterUnit='';
      this.areaUnit=''
    }

}
