import { createSearchParamsCache, parseAsString } from "nuqs/server";


/**
 *  Aquí gestionar el estado de los parámetros de búsqueda en la URL (query params)
 *  de manera segura y tipada, utilizando la librería nuqs
 */

export const voicesSearchParams = {                   // Define los parámetros de búsqueda
  query: parseAsString.withDefault(""),               // El parámetro "query" es un string que se parsea como string y tiene un valor por defecto ("" si no se proporciona)
};

export const voicesSearchParamsCache =
  createSearchParamsCache(voicesSearchParams);        // Crea un cache para los parámetros de búsqueda