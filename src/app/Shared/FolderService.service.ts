import { Injectable,EventEmitter } from '@angular/core';
declare const google: any;
@Injectable({
  providedIn: 'root'
})
export class FolderServiceService {

    constructor() { }
    Polygons: any[] = [];
    Points: any[] = [];
    Polylines: any[] = [];
    newName: string = '';
    map:any
    private readonly R = 6371; // Radius of the Earth in kilometers

    // Event emitter to notify component
  public contextMenuEvent: EventEmitter<any> = new EventEmitter();

    folderStructure: Array<{ name: string, isOpen: boolean, checked:boolean, isediting: boolean, children: Array<{ name: string,checked:boolean,type:string|null, isediting: boolean, children?: any }> }> = [
      {
        name: 'Main Folder',
        isOpen: false,
        checked:true,
        isediting: false,
        children: [

        ]
      }
    ];

    updateFolderStructure(marker: string | null,shapeType:string|null) {
      if (marker) {
      if (this.folderStructure[0].children) {
        const newEntry = { name: marker, checked: true,type:shapeType,isediting: false };
        const subfolders = this.folderStructure[0].children.filter(child => child.children);
        const files = this.folderStructure[0].children.filter(child => !child.children);
        this.folderStructure[0].children = [...subfolders, newEntry, ...files];
      }
      }
    }

    updateFileName(changedFileName: string | null, newFileName: string | null): boolean {
      if (changedFileName && newFileName && this.folderStructure.length > 0 && this.folderStructure[0].children) {
      // Check if newFileName already exists
      const allNames = this.getAllNames([this.folderStructure[0]]);
      if (allNames.includes(newFileName)) {
        console.log("New file name already exists");
        return false;
      }

      // Check and update the main folder name
      if (this.folderStructure[0].name === changedFileName) {
        this.folderStructure[0].name = newFileName;
        console.log("Main folder name changed");
        return true;
      } else {
        // Check and update the file name in children
        if (this.updateFileNameInChildren(this.folderStructure[0].children, changedFileName, newFileName)) {
        console.log("File name changed");
        }
      }

      // Update filename in Polygons array
      const polygon = this.Polygons.find(p => p.name === changedFileName);
      if (polygon) {
        polygon.name = newFileName;
        console.log("Polygon name changed");
      }

      return true;
      }
      return false;
    }

    private getAllNames(children: any[]): string[] {
      let names: string[] = [];
      for (let child of children) {
        names.push(child.name);
        if (child.children) {
          names = [...names, ...this.getAllNames(child.children)];
        }
      }
      return names;
    }

    private updateFileNameInChildren(children: any[], changedFileName: string, newFileName: string): boolean {
      for (let child of children) {
        if (child.name === changedFileName) {
          child.name = newFileName;
          return true;
        }
        if (child.children && this.updateFileNameInChildren(child.children, changedFileName, newFileName)) {
          return true;
        }
      }
      return false;
    }

    deleteFile(fileName: string | null) {
      if (fileName) {
      let itemDeleted = false;

      // Check and delete from Polygons
      let polygon = this.Polygons.find(p => p.name === fileName);
      if (polygon) {
        polygon.overlay.setMap(null);
        this.Polygons = this.Polygons.filter(p => p.name !== fileName);
        itemDeleted = true;
      }

      // Check and delete from Polylines if not found in Polygons
      if (!itemDeleted) {
        let polyline = this.Polylines.find(p => p.name === fileName);
        if (polyline) {
        polyline.overlay.setMap(null);
        this.Polylines = this.Polylines.filter(p => p.name !== fileName);
        itemDeleted = true;
        }
      }

      // Check and delete from Points if not found in Polygons or Polylines
      if (!itemDeleted) {
        let point = this.Points.find(p => p.name === fileName);
        if (point) {
        point.overlay.setMap(null);
        this.Points = this.Points.filter(p => p.name !== fileName);
        }
      }

      // Remove from folder structure
      const files = this.folderStructure[0].children.filter(child => !child.children);
      this.folderStructure[0].children = files.filter(file => file.name !== fileName);
      }
    }

    clearMap() {
      [...this.Polygons, ...this.Polylines, ...this.Points].forEach(item => item.overlay.setMap(null));

      this.Polygons = [];
      this.Polylines = [];
      this.Points = [];

      // Clear folder structure
      this.folderStructure[0].children = this.folderStructure[0].children.filter(child => child.children);
    }



    setMapForFile(fileName: any, isChecked: boolean) {
      const setMap = (item: any) => {
        if (isChecked) {
          if (item.overlay) {
            // If overlay is not null, reattach it to the map
            item.overlay.setMap(this.map); // Ensure 'this.map' is the actual map object
          }
        } else {
          // Remove overlay from the map
          if (item.overlay) {
            item.overlay.setMap(null);
          }
        }
      };

      // Check and set map for Polygons
      let polygon = this.Polygons.find(p => p.name === fileName);
      if (polygon) {
        setMap(polygon);
      }

      // Check and set map for Polylines
      let polyline = this.Polylines.find(p => p.name === fileName);
      if (polyline) {
        setMap(polyline);
      }

      // Check and set map for Points
      let point = this.Points.find(p => p.name === fileName);
      if (point) {
        setMap(point);
      }

      // If parent folder is checked, set map for all items (for all polygons, polylines, and points)
      if (this.folderStructure[0].name === fileName && isChecked) {
        this.Polygons.forEach(setMap);
        this.Polylines.forEach(setMap);
        this.Points.forEach(setMap);
      }
    }



    saveFile() {
      const kmlHeader = `<?xml version="1.0" encoding="UTF-8"?>
      <kml xmlns="http://www.opengis.net/kml/2.2">
      <Document>`;

      const kmlFooter = `</Document></kml>`;

      const createKMLPlacemark = (name: string, coordinates: string, type: string, fillColor: string, strokeColor: string) => {
        // Convert the color to the aabbggrr format (KML expects colors in this order)
        const convertToKMLColor = (color: string): string => {
          // Check if color is in '#RRGGBB' format (without alpha)
          if (color && color.length === 7 && color[0] === '#') {
            // Extract RGB values from the hex color
            const r = color.substring(1, 3);
            const g = color.substring(3, 5);
            const b = color.substring(5, 7);
            // KML format is aabbggrr
            return `ff${b}${g}${r}`;
          }
          return 'ff000000'; // Fallback if the color is invalid
        };


        const style = `
        <Style>
          <PolyStyle>
            <color>${convertToKMLColor(fillColor)}</color>
          </PolyStyle>
          <LineStyle>
            <color>${convertToKMLColor(strokeColor)}</color>
          </LineStyle>
        </Style>`;

        return `
        <Placemark>
          <name>${name}</name>
          ${style}
          <${type}>
            ${type === 'Polygon' ? `<outerBoundaryIs><LinearRing><coordinates>${coordinates}</coordinates></LinearRing></outerBoundaryIs>` : `<coordinates>${coordinates}</coordinates>`}
          </${type}>
        </Placemark>`;
      };

      const formatCoordinates = (positions: string | { lat: string; lng: string } | ({ lat: string; lng: string } | string)[]): string => {
        if (!positions) return ''; // Handle undefined or null cases
        if (typeof positions === 'string') return positions; // Directly return if it's a string
        if (!Array.isArray(positions)) positions = [positions]; // Convert single object to array

        return positions
          .map((pos: { lat: string; lng: string } | string) => {
            if (typeof pos === 'string') {
              return pos;
            } else if ('lat' in pos && 'lng' in pos) {
              return `${pos.lng},${pos.lat},0`;
            }
            return '';
          })
          .join(' ');
      };



      const polygonsKML = this.Polygons.map(polygon => createKMLPlacemark(polygon.name, formatCoordinates(polygon.position), 'Polygon', polygon.fillColor, polygon.strokeColor)).join('');
      const polylinesKML = this.Polylines.map(polyline => createKMLPlacemark(polyline.name, formatCoordinates(polyline.position), 'LineString', '', polyline.strokeColor)).join('');
      const pointsKML = this.Points.map(point => createKMLPlacemark(point.name, formatCoordinates([point.position]), 'Point', '', '')).join('');

      const kmlContent = `${kmlHeader}${polygonsKML}${polylinesKML}${pointsKML}${kmlFooter}`;

      this.uploadToBlobStorage('map_data.kml', kmlContent);
    }

    uploadToBlobStorage(fileName: string, content: string) {
    const url = 'https://localhost:7127/api/BlobStorage';
    const body = {
      fileName: fileName,
      content: content
    };

    fetch(url, {
      method: 'POST',
      headers: {
      'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    })
    .then(response => {
      if (!response.ok) {
      throw new Error('Network response was not ok');
      }
      return response.json();
    })
    .then(data => {
      console.log('File uploaded successfully:', data);
    })
    .catch(error => {
      console.error('There was a problem with the fetch operation:', error);
    });
    }



    //get the map value
    getMapValue(map:any){
      this.map=map
    }

// Function to convert color format from 'ffFF0000' to '#FF0000'
    convertColorToHex = (color: string): string => {
      // Check if the color is valid and in 'aabbggrr' format (with 'ff' prefix)
      if (color && color.length === 8 && /^[0-9A-Fa-f]{8}$/.test(color)) {
        // Extract the RGB components from the KML color
        const r = color.substring(6, 8);
        const g = color.substring(4, 6);
        const b = color.substring(2, 4);
        // Convert it to #RRGGBB format
        return `#${r}${g}${b}`;
      }
      return '#ffffff'; // Return white if the format is invalid or empty
    };


  parseKMLData(kmlData: string) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(kmlData, "application/xml");

    // Get all placemarks in the document
    const placemarks = xmlDoc.getElementsByTagName('Placemark');

    // Loop through each placemark and extract relevant information
    for (let i = 0; i < placemarks.length; i++) {
      const placemark = placemarks[i];

      // Get the name of the placemark (default 'Unnamed' if missing)
      const name = placemark.getElementsByTagName('name')[0]?.textContent || 'Unnamed';

      // Initialize common properties
      let coordinates = '';
      let fillColor = '#ffffff';  // Default fill color (white)
      let strokeColor = '#000000'; // Default stroke color (black)
      let type = '';

      // Check for different types of geometry in the placemark
      const polygon = placemark.getElementsByTagName('Polygon')[0];
      const lineString = placemark.getElementsByTagName('LineString')[0];
      const point = placemark.getElementsByTagName('Point')[0];

      if (polygon) {
        type = 'Polygon';
        coordinates = polygon.getElementsByTagName('coordinates')[0]?.textContent || '';
        // Extract style information
        const style = placemark.getElementsByTagName('Style')[0];
        fillColor = style?.getElementsByTagName('PolyStyle')[0]?.getElementsByTagName('color')[0]?.textContent || fillColor;
        strokeColor = style?.getElementsByTagName('LineStyle')[0]?.getElementsByTagName('color')[0]?.textContent || strokeColor;

        // Convert fill and stroke color to hex format
        fillColor = this.convertColorToHex(fillColor);
        strokeColor = this.convertColorToHex(strokeColor);



        // Create Polygon on Map
        const coordsArray = coordinates.trim().split(' ').map(coord => {
          const [lng, lat] = coord.split(',').map(Number);
          return { lat, lng };
        });

        const newPolygon = new google.maps.Polygon({
          paths: coordsArray,
          strokeColor: strokeColor,
          strokeOpacity: 0.8,
          strokeWeight: 2,
          fillColor: fillColor,
          fillOpacity: 0.35,
          map: this.map
        });

            // Push to the Polygons array
            this.Polygons.push({
              name,
              position:coordsArray,
              fillColor,
              strokeColor,
              overlay:newPolygon
            });

          // Attach right-click event to the polygon
        google.maps.event.addListener(newPolygon, 'rightclick', (event: any) => {
          this.newName = name;
          this.contextMenuEvent.emit({ event: event.domEvent, overlay: newPolygon,name:name });
        });

           // Call updateFolderStructure for Polyline
        this.updateFolderStructure(name, "polygon");



      }
      else if (lineString) {
        type = 'Polyline';
        coordinates = lineString.getElementsByTagName('coordinates')[0]?.textContent || '';
        // Extract style information for line
        const style = placemark.getElementsByTagName('Style')[0];
        strokeColor = style?.getElementsByTagName('LineStyle')[0]?.getElementsByTagName('color')[0]?.textContent || strokeColor;

        // Convert stroke color to hex format
        strokeColor = this.convertColorToHex(strokeColor);

        // Create Polyline on Map
        const pathArray = coordinates.trim().split(' ').map(coord => {
          const [lng, lat] = coord.split(',').map(Number);
          return { lat, lng };
        });

        const newpolyline=new google.maps.Polyline({
          path: pathArray,
          geodesic: true,
          strokeColor: strokeColor,
          strokeOpacity: 1.0,
          strokeWeight: 2,
          map: this.map
        });


        // Push to the Polylines array
        this.Polylines.push({
          name,
          position:coordinates,
          strokeColor,
          overlay:newpolyline
        });

        // Call updateFolderStructure for Polyline
        this.updateFolderStructure(name, "polyline");
      }
      else if (point) {
        type = 'Point';
        coordinates = point.getElementsByTagName('coordinates')[0]?.textContent || '';

        // Create Marker on Map
        const [lng, lat] = coordinates.split(',').map(Number);

        const newPoint=new google.maps.Marker({
          position: { lat, lng },
          map: this.map,
          title: name
        });


        // Push to the Points array
        this.Points.push({
          name,
          position:coordinates,
          overlay:newPoint
        });
        // Call updateFolderStructure for Point
        this.updateFolderStructure(name, "point");
      }
    }
  }



  /*Calculation of the areas are given below:*/


    // Convert degrees to radians
    private toRadians(degrees: number): number {
      return degrees * (Math.PI / 180);
    }

    // Function to calculate the area in square kilometers
    calculateArea(coords: { lat: number, lng: number }[]): number {
      if (!coords || coords.length < 3) return 0; // At least 3 points needed for a polygon

      let area = 0;

      for (let i = 0; i < coords.length; i++) {
        const lat1 = this.toRadians(coords[i].lat);
        const lon1 = this.toRadians(coords[i].lng);
        const lat2 = this.toRadians(coords[(i + 1) % coords.length].lat);
        const lon2 = this.toRadians(coords[(i + 1) % coords.length].lng);

        // Apply the area formula
        area += (lon2 - lon1) * (2 + Math.sin(lat1) + Math.sin(lat2));
      }

      return Math.abs(area * this.R * this.R / 2);
    }

    // Function to calculate the perimeter in kilometers
    calculatePerimeter(coords: { lat: number, lng: number }[]): number {
      if (!coords || coords.length < 2) return 0; // At least 2 points needed for a perimeter

      let perimeter = 0;

      for (let i = 0; i < coords.length; i++) {
        const lat1 = this.toRadians(coords[i].lat);
        const lon1 = this.toRadians(coords[i].lng);
        const lat2 = this.toRadians(coords[(i + 1) % coords.length].lat);
        const lon2 = this.toRadians(coords[(i + 1) % coords.length].lng);

        // Haversine formula for distance
        const dlat = lat2 - lat1;
        const dlon = lon2 - lon1;

        const a = Math.sin(dlat / 2) * Math.sin(dlat / 2) +
                  Math.cos(lat1) * Math.cos(lat2) *
                  Math.sin(dlon / 2) * Math.sin(dlon / 2);

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = this.R * c;

        perimeter += distance;
      }

      return perimeter;
    }

      // Area conversions
    convertToSquareMeters(areaInSqKm: number): number {
      return areaInSqKm * 1e6; // 1 km² = 1,000,000 m²
    }

    convertToSquareFeet(areaInSqKm: number): number {
      return areaInSqKm * 1e6 * 10.7639;
    }

    convertToSquareMiles(areaInSqKm: number): number {
      return areaInSqKm * 0.386102;
    }

    convertToSquareYards(areaInSqKm: number): number {
      return areaInSqKm * 1e6 * 1.19599;
    }

    // Perimeter conversions
    convertToCentimeters(perimeterInKm: number): number {
      return perimeterInKm * 1e5; // 1 km = 100,000 cm
    }

    convertToMeters(perimeterInKm: number): number {
      return perimeterInKm * 1000; // 1 km = 1000 meters
    }

    convertToKilometers(perimeterInKm: number): number {
      return perimeterInKm; // 1 km = 1 km
    }

    convertToInches(perimeterInKm: number): number {
      return perimeterInKm * 39370.1; // 1 km = 39,370.1 inches
    }

    convertToFeet(perimeterInKm: number): number {
      return perimeterInKm * 3280.84; // 1 km = 3280.84 feet
    }

    convertToYards(perimeterInKm: number): number {
      return perimeterInKm * 1093.61; // 1 km = 1093.61 yards
    }

    convertToMiles(perimeterInKm: number): number {
      return perimeterInKm * 0.621371; // 1 km = 0.621371 miles
    }

    convertToDegrees(perimeterInKm: number): number {
      return perimeterInKm * 180 / Math.PI; // Approximate conversion
    }
}
