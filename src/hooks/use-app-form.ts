"use client";

import {
  createFormHookContexts,
  createFormHook,
} from "@tanstack/react-form";

//Crea dos contextos de React (con sus hooks asociados):
export const {
  fieldContext,               // contexto que contiene el estado de un campo individual
  formContext,                // contexto que contiene el estado del formulario completo  
  useFieldContext,            // hook para consumir el contexto de un campo desde componentes de input personalizados
  useFormContext,             // hook para consumir el contexto del formulario desde cualquier
} = createFormHookContexts();

// Crea un hook centralizado y tipado para toda la app:
export const {
  useAppForm,                 // versión personalizada de useForm. Se usa en cualquier componente para crear un formulario, pero ya viene pre-conectado con los contextos
  useTypedAppFormContext,     // similar a useFormContext, pero con el tipo inferido automáticamente según el formulario que lo contiene
} = createFormHook({
  fieldContext,
  formContext,
  fieldComponents: {},        // Aquí se registrarían los componentes reutilizables
  formComponents: {},
});


// useAppForm()          →  crea el formulario con estado y validación
//     └── formContext   →  provee el estado del form a los hijos
//         └── fieldContext → provee el estado de cada campo a inputs personalizados
//             └── useFieldContext() → el input lo consume sin recibir props