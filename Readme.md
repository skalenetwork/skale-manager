Gerente de SKALE
Discordia Estado de la construcción codecov

Un sistema de contrato inteligente que organiza y opera la red SKALE.

Descripción
SKALE Manager controla nodos, validadores y cadenas SKALE. También contiene contratos para administrar SkaleToken, Generación de claves distribuidas (DKG) y Verificación de firmas BLS.

Capacidad de actualización
Este sistema se puede actualizar y utiliza el enfoque de funcionalidad y datos separados.

ContractManager: contrato principal de enfoque de Funcionalidad y Datos Separados. Almacena todas las direcciones de los contratos en el sistema SKALE Manager.
Permisos: contrato conectable a todos los contratos de SKALE Manager excepto ContractManager. Almacena la dirección de ContractManager y un modificador que prohíbe las llamadas solo desde el contrato dado
Estructura
Toda interacción con este sistema solo es posible a través de SKALE Manager. Para todos los estados y datos, consulte Contratos de datos. El objetivo principal de este sistema:

Nodos de control en el sistema: - Registrar, Eliminar
Controle Schains en el sistema: - Cree schain, elimine schain - Cree un grupo de nodos para Schain
Sistema de validación de control: - recopile los veredictos de los nodos por los validadores - cargue la recompensa
Instalar en pc
Clonar este repositorio
correr yarn install
Despliegue
Para crear su red, vea ejemplos en truffle-config.js

Cree un .envarchivo con los siguientes datos:

ENDPOINT="your endpoint"
ETH_PRIVATE_KEY="your private key"
NETWORK="your created network"
desplegar:

migrar trufa - red

Prueba
Necesita implementar el sistema primero

yarn test
Licencia
Licencia

Copyright (C) 2018-presente SKALE Labs
