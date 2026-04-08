import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import * as mongoose from 'mongoose';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class BackupReplicationService implements OnModuleInit {
  private readonly logger = new Logger('BackupReplication (Pro)');
  private localDb: mongoose.Connection;

  constructor(
    @InjectConnection() private readonly cloudConnection: Connection,
    private configService: ConfigService,
  ) {}

  async onModuleInit() {
    const cloudUri = this.configService.get<string>('MONGODB_CLOUD_URI');
    const localUri = this.configService.get<string>('MONGODB_LOCAL_URI');
    
    // Safety check: Ensure we are only replicating when Cloud is primary
    if (this.configService.get('DB_ENV') !== 'cloud') {
       this.logger.warn('App is not in CLOUD mode. Disabling Real-time Cloud -> Local backup.');
       return;
    }

    try {
      this.logger.log('Starting Local Backup Connection for continuous mirroring...');
      this.localDb = await mongoose.createConnection(localUri as string).asPromise();
      
      // 1. Initial Bootcamp Sync: Copy everything from Cloud to Local on startup
      await this.performFullSync();

      this.logger.log('🚀 Real-time Cloud-to-Local Replication Started via Change Streams!');
      
      // 2. Real-time Replication using Change Streams
      const db = this.cloudConnection.db;
      if (!db) {
         this.logger.error('Cloud DB connection not ready.');
         return;
      }
      const changeStream = db.watch([], { fullDocument: 'updateLookup' });
      
      changeStream.on('change', async (change: any) => {
        try {
          // Ignore system collections
          if (change.ns.coll.startsWith('system.')) return;
          
          const collection = this.localDb.collection(change.ns.coll);
          
          if (change.operationType === 'insert') {
            await collection.updateOne(
              { _id: change.documentKey._id }, 
              { $set: change.fullDocument },
              { upsert: true }
            );
            this.logger.debug(`[INSERT] Mirrored onto ${change.ns.coll}`);
          } 
          else if (change.operationType === 'update') {
            const updateObj: any = {};
            if (change.updateDescription.updatedFields) {
              updateObj.$set = change.updateDescription.updatedFields;
            }
            if (change.updateDescription.removedFields && change.updateDescription.removedFields.length > 0) {
              updateObj.$unset = {};
              change.updateDescription.removedFields.forEach((f: string) => updateObj.$unset[f] = "");
            }
            if (Object.keys(updateObj).length > 0) {
               await collection.updateOne({ _id: change.documentKey._id }, updateObj);
               this.logger.debug(`[UPDATE] Mirrored onto ${change.ns.coll}`);
            }
          } 
          else if (change.operationType === 'delete') {
            await collection.deleteOne({ _id: change.documentKey._id });
            this.logger.debug(`[DELETE] Mirrored from ${change.ns.coll}`);
          } 
          else if (change.operationType === 'replace') {
            await collection.replaceOne(
              { _id: change.documentKey._id }, 
              change.fullDocument, 
              { upsert: true }
            );
            this.logger.debug(`[REPLACE] Mirrored onto ${change.ns.coll}`);
          }
        } catch (e) {
          this.logger.error(`Replication Error on ${change.operationType}: ` + e.message);
        }
      });
      
    } catch (e) {
      this.logger.error('Failed to initialize Real-time Backup Replication: ' + e.message);
    }
  }

  // A complete overwrite from Cloud to Local on boot to ensure zero drifts
  private async performFullSync() {
    this.logger.log('📥 Performing Initial Full Snapshot Sync from Cloud to Local...');
    try {
      const db = this.cloudConnection.db;
      if (!db) {
        this.logger.error('Full Snapshot Sync failed: Cloud DB is undefined.');
        return;
      }
      
      const collections = await db.collections();
      for (const cloudColl of collections) {
        if (cloudColl.collectionName.startsWith('system.')) continue;
        
        const localColl = this.localDb.collection(cloudColl.collectionName);
        const documents = await cloudColl.find({}).toArray();
        
        if (documents.length > 0) {
          // Clear local and insert fresh snapshot
          await localColl.deleteMany({});
          await localColl.insertMany(documents);
        }
      }
      this.logger.log(`✅ Snapshot Synced: ${collections.length} collections mapped locally.`);
    } catch (e) {
      this.logger.error('Full Snapshot Sync failed: ' + e.message);
    }
  }
}
