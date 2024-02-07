import { Injectable } from '@angular/core';
import { from, Observable, of, throwError, catchError } from 'rxjs';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { map } from 'rxjs/operators';

export interface Bauobjekt {
  id: number;
  name: string;
  bwtyp: string;
  status: string;
  baujahr: number;
  standort: string;
}

@Injectable({
  providedIn: 'root'
})

export class BauobjektService {

	public online: boolean;

	public bauobjekte$: Observable<any>;
	public bauwerkKomponente$: Observable<any>;
	
    constructor(private http: HttpClient)
	{
		this.online = false;
	
		this.bauobjekte$ = {} as Observable<any>;
		this.bauwerkKomponente$ = {} as Observable<any>;

		this.getBauobjekte();
	}

	getBauobjekte()
	{
		this.online = true;
		this.bauobjekte$ =  this.http.get('http://localhost:8080/bauobjekt').pipe(
			catchError(error => this.handleGetAllError(error)));
		
		//Übertragung/Synchronisierung von lokalan Einträgen zum Backend
		let localdata = this.getAllFromIndexedDB('OVDatabase', 'ovObjectStore');
		localdata.subscribe(bauobjekte => {
			let cnt = 0;
			
            bauobjekte.forEach(bauobjekt => {
				console.log('bauobjekt', bauobjekt);
				
                this.http.post<any>('http://localhost:8080/bauobjekt', bauobjekt).subscribe({
				  next: data => {
					this.deleteFromIndexedDB(bauobjekt.id);
					console.log('Local bauobjekt added to DB', bauobjekt);
					cnt = cnt + 1;
				  },
				  error: error => {
					console.error('Local bauobjekt add to DB error!', error);
				  }
				});
				
            });
			
			if (cnt > 0)
			{
				this.bauobjekte$ =  this.http.get('http://localhost:8080/bauobjekt').pipe(
					catchError(error => this.handleGetAllError(error)));
			}
        });
			
		this.bauobjekte$ = this.bauobjekte$.pipe(
			map(bauobjekte => bauobjekte.sort((a:Bauobjekt, b:Bauobjekt) => a.id - b.id)));
	}
	
	private handleGetAllError(error: HttpErrorResponse): Observable<any> {
    if (error.status !== 200) {
		this.online = false;
      return from(this.getAllFromIndexedDB('OVDatabase', 'ovObjectStore'));
    }
    return throwError(error);
	}
  
	getBauobjekt(id: number) {
		return this.http.get<Bauobjekt>('http://localhost:8080/bauobjekt/' + id).pipe(
			catchError(error => this.handleGetError(error, id)));
	}
	
	private handleGetError(error: HttpErrorResponse, id: number): Observable<any> {
		if (error.status !== 200) {
		  return from(this.getFromIndexedDB('OVDatabase', 'ovObjectStore', id));
		}
		return throwError(error);
	}
	
	addBauobjekt(myBauobjekt: Bauobjekt)
	{		
		return this.http.post<any>('http://localhost:8080/bauobjekt', myBauobjekt).pipe(
		  catchError(error => {
			this.saveToIndexedDB(myBauobjekt);
			return throwError(() => new Error('Failed to send Bauobjekt, data saved locally'));
		  })
		).subscribe({
		  next: data => {
			this.getBauobjekte();
		  },
		  error: error => {
			console.error('There was an error!', error);
		  }
		});
	}
	
	editBauobjekt(myBauobjekt: Bauobjekt)
	{		
		return this.http.put<any>('http://localhost:8080/bauobjekt', myBauobjekt).pipe(
		  catchError(error => {
			this.replaceInIndexedDB(myBauobjekt);
			return throwError(() => new Error('Failed to edit Bauobjekt, data saved locally'));
		  })
		).subscribe({
		  next: data => {
			this.getBauobjekte();
		  },
		  error: error => {
			// Handle error here
			console.error('There was an error!', error);
		  }
		});
	}
	
	delBauobjekt(id: number)
	{		
		return this.http.delete<any>('http://localhost:8080/bauobjekt/' + id).pipe(
		  catchError(error => {
			this.deleteFromIndexedDB(id);
			return throwError(() => new Error('Failed to delete Bauobjekt, data deleted locally'));
		  })
		).subscribe({
		  next: data => {
			this.getBauobjekte();
		  },
		  error: error => {
			// Handle error here
			console.error('There was an error!', error);
		  }
		});
	}
	
	getBauwerkKomponente(id: number)
	{
		this.bauwerkKomponente$ = this.http.get('http://localhost:8080/bauwerkkomponente/' + id);
	}
	
	addBauwerkKomponente(id: number, bauwerkKomponente: string)
	{		
		return this.http.post<any>('http://localhost:8080/bauwerkkomponente/' + id, bauwerkKomponente).pipe(
		  catchError(error => {
			return throwError(() => new Error('Failed to add BauwerkKomponente, data saved locally'));
		  })
		).subscribe({
		  next: data => {
			this.getBauwerkKomponente(id);
		  },
		  error: error => {
			// Handle error here
			console.error('There was an error!', error);
		  }
		});
	}
	
	delBauwerkKomponente(id: number, bauwerkKomponente: string)
	{		
		return this.http.delete<any>('http://localhost:8080/bauwerkkomponente/' + id + '/' + bauwerkKomponente).pipe(
		  catchError(error => {
			return throwError(() => new Error('Failed to delete BauwerkKomponente, system is offline'));
		  })
		).subscribe({
		  next: data => {
			this.getBauwerkKomponente(id);
		  },
		  error: error => {
			// Handle error here
			console.error('There was an error!', error);
		  }
		});
	}
	
	private saveToIndexedDB(myBauobjekt: Bauobjekt) {
		let db: IDBDatabase;
		
		const requestDB = indexedDB.open("OVDatabase", 1);

		requestDB.onupgradeneeded = event => {
			db = requestDB.result;
			if (!db.objectStoreNames.contains('ovObjectStore')) {
				db.createObjectStore('ovObjectStore', { keyPath: 'id' });
			}
		};

		requestDB.onsuccess = event => {
			db = requestDB.result;
			
			this.getLowestId(db, 'ovObjectStore').then(value => {
				
				myBauobjekt.id = value - 1;

				const transaction = db.transaction('ovObjectStore', 'readwrite');
				const store = transaction.objectStore('ovObjectStore');
				const request = store.add(myBauobjekt);

				request.onsuccess = () => {
					console.log('Data added to the store', request.result);
					this.getBauobjekte();
				};

				request.onerror = () => {
					console.error('Error adding data to the store', request.error);
				};
			}).catch(error => {
				console.log('getLowestId Error:', error);
			});
		};

		requestDB.onerror = event => {
			console.error('IndexedDB error:', requestDB.error);
		};
	}
	
	private getLowestId(db: IDBDatabase, storeName: string): Promise<number> {
	return new Promise((resolve, reject) => {
		const transaction = db.transaction(storeName, 'readonly');
		const store = transaction.objectStore(storeName);
		const request = store.openCursor();

		let lowestId: number = -1;

		request.onsuccess = event => {
			let cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
			if (cursor) {
				// Assuming the ID is a number and is the key of the store
				let currentId = cursor.key as number;

				if (lowestId === undefined || currentId < lowestId) {
					lowestId = currentId;
				}

				cursor.continue();
			} else {
				// No more entries, resolve the promise
				resolve(lowestId);
			}
		};

		request.onerror = () => {
			resolve(-1);
		};
	});
}
	
	private getAllFromIndexedDB(dbName: string, storeName: string): Observable<any[]> {
		return new Observable(observer => {
			const request = indexedDB.open(dbName);
			request.onerror = (event) => {
				observer.error('IndexedDB error: ' + request.error?.message);
			};

			request.onsuccess = (event) => {
				const db = request.result;
				
				const transaction = db.transaction(storeName, 'readonly');
				const store = transaction.objectStore(storeName);
				const allRecordsRequest = store.getAll();

				allRecordsRequest.onerror = (event) => {
					observer.error('Error reading from store: ' + allRecordsRequest.error?.message);
				};

				allRecordsRequest.onsuccess = (event) => {
					observer.next(allRecordsRequest.result);
					observer.complete();
				};
			};
		});
	}
	
	private getFromIndexedDB(dbName: string, storeName: string, id: number): Observable<any> {
		return new Observable(observer => {
			const request = indexedDB.open(dbName);
			request.onerror = (event) => {
				observer.error('IndexedDB error: ' + request.error?.message);
			};

			request.onsuccess = (event) => {
				const db = request.result;
				
				const transaction = db.transaction(storeName, 'readonly');
				const store = transaction.objectStore(storeName);
				const allRecordsRequest = store.get(id);

				allRecordsRequest.onerror = (event) => {
					observer.error('Error reading from store: ' + allRecordsRequest.error?.message);
				};

				allRecordsRequest.onsuccess = (event) => {
					observer.next(allRecordsRequest.result);
					observer.complete();
				};
			};
		});
	}
	
	private deleteFromIndexedDB(id: number) {
		let db: IDBDatabase;
		
		const requestDB = indexedDB.open("OVDatabase", 1);

		requestDB.onsuccess = event => {
			db = requestDB.result;

			const transaction = db.transaction('ovObjectStore', 'readwrite');
			const store = transaction.objectStore('ovObjectStore');
			const deleteRequest = store.delete(id);

			deleteRequest.onerror = (event) => {
				console.log('Error deleting from store: ', deleteRequest.error?.message);
			};

			deleteRequest.onsuccess = (event) => {
				console.log('Data deleting from store');
				this.getBauobjekte();
			};
		};
	}
	
	private replaceInIndexedDB(myBauobjekt: Bauobjekt) {
		let db: IDBDatabase;
		
		const requestDB = indexedDB.open("OVDatabase", 1);

		requestDB.onsuccess = event => {
			db = requestDB.result;

			const transaction = db.transaction('ovObjectStore', 'readwrite');
			const store = transaction.objectStore('ovObjectStore');
			const updateRequest = store.put(myBauobjekt);

			updateRequest.onerror = (event) => {
				console.log('Error updating the store', updateRequest.error?.message);
			};

			updateRequest.onsuccess = (event) => {
				console.log('Data updated in store');
				this.getBauobjekte();
			};
		};
	}
}