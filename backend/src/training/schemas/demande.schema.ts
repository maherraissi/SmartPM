import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type DemandeDocument = Demande & Document;

export enum DemandeStatus {
  EN_ATTENTE = 'EN_ATTENTE', // Etat: ED — En attente de décision
  APPROUVEE  = 'APPROUVEE',  // Manager a validé l'inscription
  REJETEE    = 'REJETEE',    // Manager a refusé
}

/**
 * Demande — relation Membre (1) → Demande (*) → Formation
 * Un Membre soumet une demande pour accéder à une Formation.
 * Le Manager supervise et décide (Suivi).
 */
@Schema({ timestamps: true })
export class Demande {
  // Le Membre qui fait la demande (User avec rôle MEMBER)
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  membreId: Types.ObjectId | string;

  // La Formation demandée
  @Prop({ type: Types.ObjectId, ref: 'Training', required: true })
  formationId: Types.ObjectId | string;

  // Motif/justification de la demande
  @Prop({ required: true })
  motif: string;

  // Etat: ED (En attente / Approuvée / Rejetée)
  @Prop({ type: String, enum: DemandeStatus, default: DemandeStatus.EN_ATTENTE })
  statut: DemandeStatus;

  // Manager qui traite la demande (Suivi)
  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  managerId: Types.ObjectId | string | null;

  // Note du Manager lors de la décision
  @Prop({ type: String, default: null })
  noteManager: string | null;
}

export const DemandeSchema = SchemaFactory.createForClass(Demande);

// Un membre ne peut soumettre qu'une seule demande par formation
DemandeSchema.index({ membreId: 1, formationId: 1 }, { unique: true });
