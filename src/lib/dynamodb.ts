import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

import { env, isLocalDynamo } from "./env";

/**
 * Client DynamoDB partagé (P2.6).
 *
 * Une seule instance par processus. En environnement serverless, le module est
 * conservé entre deux invocations d'une même instance chaude : recréer un
 * client à chaque requête rejouerait la résolution d'identifiants et la
 * négociation TLS pour rien.
 *
 * Ce module est le **seul** point du code qui parle au SDK AWS. Tout ce qui
 * est au-dessus passe par un repository, conformément à la règle de dépendance
 * des couches.
 */

/**
 * En développement, Next.js recharge les modules à chaque édition. Sans ce
 * cache global, chaque rechargement laisserait derrière lui un client et ses
 * sockets. On garde donc l'instance sur `globalThis`, qui survit au rechargement.
 */
const globalForDynamo = globalThis as unknown as {
  __tynocClient?: DynamoDBClient;
  __tynocDocumentClient?: DynamoDBDocumentClient;
};

function createClient(): DynamoDBClient {
  return new DynamoDBClient({
    region: env.APP_AWS_REGION,
    credentials: {
      accessKeyId: env.APP_AWS_ACCESS_KEY_ID,
      secretAccessKey: env.APP_AWS_SECRET_ACCESS_KEY,
    },
    /**
     * Présent uniquement en développement, où il pointe vers DynamoDB Local.
     * Absent en production : le SDK cible alors le service AWS réel.
     */
    ...(isLocalDynamo ? { endpoint: env.DYNAMODB_ENDPOINT } : {}),

    /**
     * Délais d'attente explicites.
     *
     * Sans eux, une base injoignable ne produit pas une erreur : elle produit
     * une **attente**. La page reste en cours de rendu, le navigateur tourne, et
     * la frontière d'erreur ne s'affiche jamais puisque rien n'a encore échoué.
     * Constaté en développement, conteneur arrêté : la requête n'est jamais
     * revenue.
     *
     * Mieux vaut échouer en deux secondes, ce que la frontière d'erreur sait
     * montrer, que pendre indéfiniment.
     */
    requestHandler: {
      connectionTimeout: 2_000,
      requestTimeout: 5_000,
    },

    /**
     * Trois tentatives au total. DynamoDB renvoie de vraies erreurs
     * transitoires qu'un seul essai transformerait en panne visible, mais
     * au-delà de trois l'utilisateur attend plus longtemps qu'il n'accepte.
     */
    maxAttempts: 3,
  });
}

function createDocumentClient(client: DynamoDBClient): DynamoDBDocumentClient {
  return DynamoDBDocumentClient.from(client, {
    marshallOptions: {
      /**
       * DynamoDB refuse une valeur `undefined`. Sans cette option, tout champ
       * optionnel laissé vide ferait échouer l'écriture, et le code se
       * remplirait de suppressions manuelles de propriétés.
       */
      removeUndefinedValues: true,
      /** Les chaînes vides sont des valeurs légitimes, pas des absences. */
      convertEmptyValues: false,
    },
    unmarshallOptions: {
      /**
       * Les nombres reviennent en `number` et non en `BigInt`. Les montants du
       * projet sont des entiers de centimes, très en deçà de `Number.MAX_SAFE_INTEGER`.
       */
      wrapNumbers: false,
    },
  });
}

/**
 * Client bas niveau. Réservé aux opérations de structure (création de table,
 * TTL) que le DocumentClient n'expose pas. Le code applicatif n'y touche pas.
 */
export const dynamoClient: DynamoDBClient = globalForDynamo.__tynocClient ?? createClient();

/** Client de données, celui qu'utilisent les repositories. */
export const documentClient: DynamoDBDocumentClient =
  globalForDynamo.__tynocDocumentClient ?? createDocumentClient(dynamoClient);

if (env.NODE_ENV !== "production") {
  globalForDynamo.__tynocClient = dynamoClient;
  globalForDynamo.__tynocDocumentClient = documentClient;
}

/** Nom de la table unique, une par environnement. */
export const TABLE_NAME = env.DYNAMODB_TABLE_NAME;
