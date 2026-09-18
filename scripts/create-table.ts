/**
 * Création de la table et de ses index (P2.7).
 *
 *   npm run db:up            démarre DynamoDB Local
 *   npm run db:create-table  crée la table si elle n'existe pas
 *
 * Idempotent : relancer le script sur une table existante ne produit ni erreur
 * ni modification. C'est ce qui permet de l'appeler sans réfléchir avant un
 * seed, en CI comme sur une machine neuve.
 */

import {
  CreateTableCommand,
  DescribeTableCommand,
  ResourceNotFoundException,
  UpdateTimeToLiveCommand,
  waitUntilTableExists,
  type CreateTableCommandInput,
} from "@aws-sdk/client-dynamodb";

import { dynamoClient, TABLE_NAME } from "@/lib/dynamodb";
import { env, isLocalDynamo } from "@/lib/env";
import { GSI1_NAME, GSI2_NAME } from "@/lib/keys";

// Les opérations de structure passent par le client bas niveau : le
// DocumentClient n'expose que les opérations de données.
const client = dynamoClient;

const definition: CreateTableCommandInput = {
  TableName: TABLE_NAME,

  /**
   * Facturation à la demande : aucune capacité à provisionner, aucune facture
   * quand personne ne visite le site. C'est le bon mode pour une vitrine dont
   * le trafic est imprévisible et faible.
   */
  BillingMode: "PAY_PER_REQUEST",

  KeySchema: [
    { AttributeName: "PK", KeyType: "HASH" },
    { AttributeName: "SK", KeyType: "RANGE" },
  ],

  /**
   * Seuls les attributs qui participent à une clé sont déclarés. Tous les
   * autres restent libres : c'est le principe du schéma souple de DynamoDB,
   * et c'est ce qui permet à cinq entités de cohabiter dans une table.
   */
  AttributeDefinitions: [
    { AttributeName: "PK", AttributeType: "S" },
    { AttributeName: "SK", AttributeType: "S" },
    { AttributeName: "GSI1PK", AttributeType: "S" },
    { AttributeName: "GSI1SK", AttributeType: "S" },
    { AttributeName: "GSI2PK", AttributeType: "S" },
    { AttributeName: "GSI2SK", AttributeType: "S" },
  ],

  GlobalSecondaryIndexes: [
    {
      /** Listing : catalogue complet et catégorie triée par prix (A3, A4, A10). */
      IndexName: GSI1_NAME,
      KeySchema: [
        { AttributeName: "GSI1PK", KeyType: "HASH" },
        { AttributeName: "GSI1SK", KeyType: "RANGE" },
      ],
      /**
       * Projection complète : les cartes produit affichent titre, prix, image,
       * stock et tags. Une projection partielle imposerait une lecture
       * supplémentaire par produit, soit exactement le problème N+1.
       */
      Projection: { ProjectionType: "ALL" },
    },
    {
      /** Résolution d'un slug d'URL vers son produit (A2). */
      IndexName: GSI2_NAME,
      KeySchema: [
        { AttributeName: "GSI2PK", KeyType: "HASH" },
        { AttributeName: "GSI2SK", KeyType: "RANGE" },
      ],
      Projection: { ProjectionType: "ALL" },
    },
  ],
};

async function tableExists(): Promise<boolean> {
  try {
    await client.send(new DescribeTableCommand({ TableName: TABLE_NAME }));
    return true;
  } catch (error) {
    if (error instanceof ResourceNotFoundException) return false;
    throw error;
  }
}

/**
 * Active l'expiration automatique des items de session (P16.7).
 *
 * Le TTL est une fonction de la table, pas des items : l'attribut `expiresAt`
 * est déjà écrit par les repositories, mais AWS ne purge rien tant que la
 * table ne désigne pas cet attribut. DynamoDB Local accepte l'appel sans
 * réellement purger, ce qui est sans conséquence en développement.
 */
async function enableTtl(): Promise<void> {
  try {
    await client.send(
      new UpdateTimeToLiveCommand({
        TableName: TABLE_NAME,
        TimeToLiveSpecification: { AttributeName: "expiresAt", Enabled: true },
      }),
    );
    console.log("TTL actif sur l'attribut expiresAt.");
  } catch (error) {
    // Réactiver un TTL déjà actif est une erreur côté AWS, pas un problème ici.
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("already enabled") || message.includes("TimeToLive is active")) {
      console.log("TTL déjà actif, rien à faire.");
      return;
    }
    throw error;
  }
}

async function main(): Promise<void> {
  console.log(
    `Cible : ${TABLE_NAME} (${isLocalDynamo ? `local, ${env.DYNAMODB_ENDPOINT}` : `AWS, ${env.APP_AWS_REGION}`})`,
  );

  if (await tableExists()) {
    console.log("La table existe déjà, aucune création nécessaire.");
    await enableTtl();
    return;
  }

  await client.send(new CreateTableCommand(definition));
  console.log("Création demandée, attente de la disponibilité...");

  await waitUntilTableExists({ client, maxWaitTime: 120 }, { TableName: TABLE_NAME });
  console.log(`Table ${TABLE_NAME} prête, index ${GSI1_NAME} et ${GSI2_NAME} inclus.`);

  await enableTtl();
}

main().catch((error: unknown) => {
  console.error("Échec de la création de la table :", error);
  process.exitCode = 1;
});
