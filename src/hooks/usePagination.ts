import { useState, useEffect } from 'react';

export function usePagination<T>(data: T[], itemsPerPage: number) {
    const [currentPage, setCurrentPage] = useState(1);

    // Reset to page 1 when data changes (e.g., search or tab switch)
    useEffect(() => {
        setCurrentPage(1);
    }, [data.length, JSON.stringify(data.slice(0, 5).map(item => (item as any)._id || (item as any).id))]);

    const maxPage = Math.ceil(data.length / itemsPerPage);

    const currentData = () => {
        const begin = (currentPage - 1) * itemsPerPage;
        const end = begin + itemsPerPage;
        return data.slice(begin, end);
    };

    const next = () => {
        setCurrentPage((currentPage) => Math.min(currentPage + 1, maxPage));
    };

    const prev = () => {
        setCurrentPage((currentPage) => Math.max(currentPage - 1, 1));
    };

    const jump = (page: number) => {
        const pageNumber = Math.max(1, page);
        setCurrentPage(() => Math.min(pageNumber, maxPage));
    };

    return { next, prev, jump, currentData, currentPage, maxPage };
}
