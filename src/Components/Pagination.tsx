import React, { useState, useEffect, useRef } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Paginator } from 'primereact/paginator';
import { OverlayPanel } from 'primereact/overlaypanel';
import { Button } from 'primereact/button';
import { InputNumber, InputNumberValueChangeEvent } from 'primereact/inputnumber';
import { Toast } from 'primereact/toast';
import axios from 'axios';

interface Artwork {
    id: number;
    title: string;
    place_of_origin: string;
    artist_display: string;
    inscriptions: string;
    date_start: number;
    date_end: number;
}

const Pagination: React.FC = () => {
    const [artworks, setArtworks] = useState<Artwork[]>([]);
    const [totalRecords, setTotalRecords] = useState(0);
    const [first, setFirst] = useState(0);
    const [rows, setRows] = useState(10);
    const [selectedArtworks, setSelectedArtworks] = useState<{ [key: number]: Artwork }>({});
    const [numberInput, setNumberInput] = useState<number | null>(null);
    const op = useRef<OverlayPanel>(null);
    const toast = useRef<Toast>(null);

    useEffect(() => {
        fetchArtworks(1);
    }, []);

    const fetchArtworks = async (page: number) => {
        try {
            const response = await axios.get(`https://api.artic.edu/api/v1/artworks?page=${page}&limit=${rows}`);
            setArtworks(response.data.data);
            setTotalRecords(response.data.pagination.total);
        } catch (error) {
            console.error('Error fetching artworks:', error);
            toast.current?.show({ severity: 'error', summary: 'Error', detail: 'Failed to fetch artworks', life: 3000 });
        }
    };

    const onPageChange = (event: { first: number; rows: number; page: number }) => {
        setFirst(event.first);
        setRows(event.rows);
        fetchArtworks(event.page + 1);
    };

    const onSelectionChange = (event: { value: Artwork[] }) => {
        const newSelection = { ...selectedArtworks };
        const currentPageIds = new Set(artworks.map(artwork => artwork.id));

        Object.keys(newSelection).forEach(id => {
            if (currentPageIds.has(Number(id)) && !event.value.find(artwork => artwork.id === Number(id))) {
                delete newSelection[Number(id)];
            }
        });

        event.value.forEach(artwork => {
            newSelection[artwork.id] = artwork;
        });

        setSelectedArtworks(newSelection);
    };

    const toggleExpand = (event: React.MouseEvent<HTMLButtonElement>) => {
        op.current?.toggle(event);
    };

    const handleNumberChange = (e: InputNumberValueChangeEvent) => {
        setNumberInput(e.value ?? null);
    };

    const handleCustomSelection = async () => {
        if (numberInput === null) return;

        const currentSelection = { ...selectedArtworks };
        const currentSelectionCount = Object.keys(currentSelection).length;

        if (numberInput <= currentSelectionCount) {
            const sortedKeys = Object.keys(currentSelection).sort((a, b) => Number(a) - Number(b));
            const keysToKeep = sortedKeys.slice(0, numberInput);
            const newSelection = keysToKeep.reduce((acc, key) => {
                acc[Number(key)] = currentSelection[Number(key)];
                return acc;
            }, {} as { [key: number]: Artwork });

            setSelectedArtworks(newSelection);
            toast.current?.show({
                severity: 'info',
                summary: 'Selection Updated',
                detail: `Selection trimmed to ${numberInput} items.`,
                life: 3000
            });
        } else {
            const additionalSelectionsNeeded = numberInput - currentSelectionCount;

            if (additionalSelectionsNeeded > 0) {
                const totalPages = Math.ceil(additionalSelectionsNeeded / rows);
                let newSelections: Artwork[] = [];

                for (let i = 0; i < totalPages; i++) {
                    const page = Math.floor(first / rows) + i + 1;
                    try {
                        const response = await axios.get(`https://api.artic.edu/api/v1/artworks?page=${page}&limit=${rows}`);
                        const pageArtworks = response.data.data;
                        const remainingCount = additionalSelectionsNeeded - newSelections.length;
                        const artworksToAdd = pageArtworks.slice(0, remainingCount);
                        newSelections = [...newSelections, ...artworksToAdd];

                        if (newSelections.length === additionalSelectionsNeeded) break;
                    } catch (error) {
                        console.error('Error fetching additional artworks:', error);
                        toast.current?.show({
                            severity: 'error',
                            summary: 'Error',
                            detail: 'Failed to fetch additional artworks',
                            life: 3000
                        });
                        break;
                    }
                }

                newSelections.forEach(artwork => {
                    if (!currentSelection[artwork.id]) {
                        currentSelection[artwork.id] = artwork;
                    }
                });

                setSelectedArtworks(currentSelection);
                toast.current?.show({
                    severity: 'success',
                    summary: 'Selection Updated',
                    detail: `Selection expanded to ${Object.keys(currentSelection).length} items.`,
                    life: 3000
                });
            }
        }

        op.current?.hide();
    };

    const customSelectionButton = () => {
        return (
            <Button
                icon="pi pi-list"
                onClick={toggleExpand}
                tooltip="Custom Selection"
                className="btn p-button-rounded p-button-text"
            >▼</Button >
        );
    };

    return (
        <div className="card">
            <Toast ref={toast} />
            <h1 className='heading'>GrowMeOrganic</h1>
            <div className='table'>
                <DataTable
                    value={artworks}
                    selectionMode="multiple"
                    selection={Object.values(selectedArtworks)}
                    onSelectionChange={onSelectionChange}
                    className='table'
                >
                    <Column selectionMode="multiple" headerStyle={{ width: '3em' }}></Column>
                    <Column header={customSelectionButton} bodyStyle={{ textAlign: 'center' }} style={{ width: '4em' }} />
                    <Column field="title" header="Title" />
                    <Column field="place_of_origin" header="Place of Origin" />
                    <Column field="artist_display" header="Artist" />
                    <Column field="inscriptions" header="Inscriptions" />
                    <Column field="date_start" header="Start Date" />
                    <Column field="date_end" header="End Date" />
                </DataTable>
            </div>
            <Paginator
                first={first}
                rows={rows}
                totalRecords={totalRecords}
                onPageChange={onPageChange}
            />
            <OverlayPanel ref={op} dismissable>
                <div className="p-4">
                    <h3>Enter Number of Rows</h3>
                    <div className="flex align-items-center">
                        <InputNumber
                            value={numberInput}
                            onValueChange={handleNumberChange}
                            placeholder="Enter a number"
                            min={1}
                            max={totalRecords}
                            className="mr-2"
                        />
                        <Button style={{ color: "blue" }} label="Submit" onClick={handleCustomSelection} />
                    </div>
                </div>
            </OverlayPanel>
        </div>
    );
};

export default Pagination;
