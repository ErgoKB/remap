import firebase from 'firebase/app';
import 'firebase/firestore';
import 'firebase/auth';
import {
  ICreateKeyboardDefinitionDocumentResult,
  IFetchKeyboardDefinitionDocumentResult,
  IFetchMyKeyboardDefinitionDocumentsResult,
  IKeyboardDefinitionDocument,
  IKeyboardDefinitionStatus,
  ISavedKeymapData,
  IKeymapDataResule,
  IResult,
  IStorage,
} from '../storage/Storage';
import { IAuth } from '../auth/Auth';
import { IFirmwareCodePlace } from '../../store/state';

const config = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGE_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
};

export class FirebaseProvider implements IStorage, IAuth {
  private db: firebase.firestore.Firestore;
  private auth: firebase.auth.Auth;
  private unsubscribeAuthStateChanged?: firebase.Unsubscribe;

  constructor() {
    firebase.initializeApp(config);
    const app = firebase.app();
    this.db = app.firestore();
    this.auth = app.auth();
  }

  private createResult(
    querySnapshot: firebase.firestore.QuerySnapshot
  ): IFetchKeyboardDefinitionDocumentResult {
    return {
      success: true,
      exists: true,
      document: this.generateKeyboardDefinitionDocument(querySnapshot.docs[0]),
    };
  }

  private generateKeyboardDefinitionDocument(
    documentSnapshot: firebase.firestore.DocumentSnapshot
  ): IKeyboardDefinitionDocument {
    return {
      id: documentSnapshot.id,
      name: documentSnapshot.data()!.name,
      vendorId: documentSnapshot.data()!.vendor_id,
      productId: documentSnapshot.data()!.product_id,
      productName: documentSnapshot.data()!.product_name,
      authorUid: documentSnapshot.data()!.author_uid,
      status: documentSnapshot.data()!.status,
      json: documentSnapshot.data()!.json,
      rejectReason: documentSnapshot.data()!.reject_reason,
      githubDisplayName: documentSnapshot.data()!.github_display_name,
      githubUrl: documentSnapshot.data()!.github_url,
      firmwareCodePlace: documentSnapshot.data()!.firmware_code_place,
      qmkRepositoryFirstPullRequestUrl: documentSnapshot.data()!
        .qmk_repository_first_pull_request_url,
      forkedRepositoryUrl: documentSnapshot.data()!.forked_repository_url,
      forkedRepositoryEvidence: documentSnapshot.data()!
        .forked_repository_evidence,
      otherPlaceHowToGet: documentSnapshot.data()!.other_place_how_to_get,
      otherPlaceSourceCodeEvidence: documentSnapshot.data()!
        .other_place_source_code_evidence,
      otherPlacePublisherEvidence: documentSnapshot.data()!
        .other_place_publisher_evidence,
      createdAt: documentSnapshot.data()!.created_at.toDate(),
      updatedAt: documentSnapshot.data()!.updated_at.toDate(),
    };
  }

  async fetchMyKeyboardDefinitionDocumentById(
    definitionId: string
  ): Promise<IFetchKeyboardDefinitionDocumentResult> {
    try {
      const queryDocumentSnapshot = await this.db
        .collection('keyboards')
        .doc('v2')
        .collection('definitions')
        .where('author_uid', '==', this.auth.currentUser!.uid)
        .get();
      const result = queryDocumentSnapshot.docs.find(
        (value) => value.id === definitionId
      );
      if (result) {
        return {
          success: true,
          exists: true,
          document: this.generateKeyboardDefinitionDocument(result),
        };
      } else {
        return {
          success: true,
          exists: false,
        };
      }
    } catch (error) {
      console.error(error);
      return {
        success: false,
        error: 'Fetching the keyboard definition document failed',
        cause: error,
      };
    }
  }

  async fetchMyKeyboardDefinitionDocuments(): Promise<IFetchMyKeyboardDefinitionDocumentsResult> {
    try {
      const querySnapshot = await this.db
        .collection('keyboards')
        .doc('v2')
        .collection('definitions')
        .where('author_uid', '==', this.auth.currentUser!.uid)
        .orderBy('updated_at', 'desc')
        .get();
      return {
        success: true,
        documents: querySnapshot.docs.map((queryDocumentSnapshot) =>
          this.generateKeyboardDefinitionDocument(queryDocumentSnapshot)
        ),
      };
    } catch (error) {
      console.error(error);
      return {
        success: false,
        error: 'Fetching the keyboard definition document failed',
        cause: error,
      };
    }
  }

  async fetchKeyboardDefinitionDocumentByDeviceInfo(
    vendorId: number,
    productId: number,
    productName: string
  ): Promise<IFetchKeyboardDefinitionDocumentResult> {
    try {
      const querySnapshotByVidAndPid = await this.db
        .collection('keyboards')
        .doc('v2')
        .collection('definitions')
        .where('vendor_id', '==', vendorId)
        .where('product_id', '==', productId)
        .where('status', '==', 'approved')
        .get();
      let docs = querySnapshotByVidAndPid.docs;
      if (docs.length > 1) {
        docs = docs.filter((doc) =>
          doc.data().product_name.endsWith(productName)
        );
      }
      if (docs.length === 0) {
        console.warn(
          `Keyboard definition not found: ${vendorId}:${productId}:${productName}`
        );
        return {
          success: true,
          exists: false,
        };
      } else if (docs.length > 1) {
        return {
          success: false,
          error: `There are duplicate keyboard definition documents: ${vendorId}:${productId}:${productName}`,
        };
      } else {
        return this.createResult(querySnapshotByVidAndPid);
      }
    } catch (error) {
      console.error(error);
      return {
        success: false,
        error: 'Fetching the keyboard definition document failed',
        cause: error,
      };
    }
  }

  async updateKeyboardDefinitionJson(
    definitionId: string,
    jsonStr: string
  ): Promise<IResult> {
    try {
      const now = new Date();
      await this.db
        .collection('keyboards')
        .doc('v2')
        .collection('definitions')
        .doc(definitionId)
        .update({
          json: jsonStr,
          updated_at: now,
        });
      return {
        success: true,
      };
    } catch (error) {
      console.error(error);
      return {
        success: false,
        error: 'Updating the Keyboard Definition JSON content failed.',
        cause: error,
      };
    }
  }

  async updateKeyboardDefinitionDocument(
    definitionId: string,
    name: string,
    vendorId: number,
    productId: number,
    productName: string,
    jsonStr: string,
    firmwareCodePlace: IFirmwareCodePlace,
    qmkRepositoryFirstPullRequestUrl: string,
    forkedRepositoryUrl: string,
    forkedRepositoryEvidence: string,
    otherPlaceHowToGet: string,
    otherPlaceSourceCodeEvidence: string,
    otherPlacePublisherEvidence: string,
    status: IKeyboardDefinitionStatus
  ): Promise<IResult> {
    try {
      const now = new Date();
      await this.db
        .collection('keyboards')
        .doc('v2')
        .collection('definitions')
        .doc(definitionId)
        .update({
          updated_at: now,
          json: jsonStr,
          name,
          product_id: productId,
          vendor_id: vendorId,
          product_name: productName,
          firmware_code_place: firmwareCodePlace,
          qmk_repository_first_pull_request_url: qmkRepositoryFirstPullRequestUrl,
          forked_repository_url: forkedRepositoryUrl,
          forked_repository_evidence: forkedRepositoryEvidence,
          other_place_how_to_get: otherPlaceHowToGet,
          other_place_source_code_evidence: otherPlaceSourceCodeEvidence,
          other_place_publisher_evidence: otherPlacePublisherEvidence,
          status,
        });
      return {
        success: true,
      };
    } catch (error) {
      console.error(error);
      return {
        success: false,
        error: 'Updating the Keyboard Definition failed.',
        cause: error,
      };
    }
  }

  async createKeyboardDefinitionDocument(
    authorUid: string,
    name: string,
    vendorId: number,
    productId: number,
    productName: string,
    jsonStr: string,
    githubUid: string,
    githubDisplayName: string,
    githubEmail: string,
    githubUrl: string,
    firmwareCodePlace: IFirmwareCodePlace,
    qmkRepositoryFirstPullRequestUrl: string,
    forkedRepositoryUrl: string,
    forkedRepositoryEvidence: string,
    otherPlaceHowToGet: string,
    otherPlaceSourceCodeEvidence: string,
    otherPlacePublisherEvidence: string,
    status: IKeyboardDefinitionStatus
  ): Promise<ICreateKeyboardDefinitionDocumentResult> {
    try {
      const now = new Date();
      const definitionDocumentReference = await this.db
        .collection('keyboards')
        .doc('v2')
        .collection('definitions')
        .add({
          author_uid: authorUid,
          created_at: now,
          updated_at: now,
          json: jsonStr,
          name,
          product_id: productId,
          vendor_id: vendorId,
          product_name: productName,
          status,
          github_display_name: githubDisplayName,
          github_url: githubUrl,
          firmware_code_place: firmwareCodePlace,
          qmk_repository_first_pull_request_url: qmkRepositoryFirstPullRequestUrl,
          forked_repository_url: forkedRepositoryUrl,
          forked_repository_evidence: forkedRepositoryEvidence,
          other_place_how_to_get: otherPlaceHowToGet,
          other_place_source_code_evidence: otherPlaceSourceCodeEvidence,
          other_place_publisher_evidence: otherPlacePublisherEvidence,
        });
      await definitionDocumentReference.collection('secure').doc('github').set({
        github_display_name: githubDisplayName,
        github_email: githubEmail,
        github_uid: githubUid,
      });
      return {
        success: true,
        definitionId: definitionDocumentReference.id,
      };
    } catch (error) {
      console.error(error);
      return {
        success: false,
        error: 'Creating a new Keyboard Definition failed.',
        cause: error,
      };
    }
  }

  async deleteKeyboardDefinitionDocument(
    definitionId: string
  ): Promise<IResult> {
    try {
      await this.db
        .collection('keyboards')
        .doc('v2')
        .collection('definitions')
        .doc(definitionId)
        .collection('secure')
        .doc('github')
        .delete();
      await this.db
        .collection('keyboards')
        .doc('v2')
        .collection('definitions')
        .doc(definitionId)
        .delete();
      return {
        success: true,
      };
    } catch (error) {
      console.error(error);
      return {
        success: false,
        error: 'Deleting the keyboard definition failed.',
        cause: error,
      };
    }
  }

  signInWithGitHub(): Promise<void> {
    const provider = new firebase.auth.GithubAuthProvider();
    return this.auth.signInWithRedirect(provider);
  }

  // eslint-disable-next-line no-unused-vars
  subscribeAuthStatus(callback: (user: firebase.User | null) => void): void {
    this.unsubscribeAuthStateChanged && this.unsubscribeAuthStateChanged();
    this.unsubscribeAuthStateChanged = this.auth.onAuthStateChanged(
      (user: firebase.User | null) => {
        callback(user);
      }
    );
  }

  getCurrentAuthenticatedUser(): firebase.User {
    return this.auth.currentUser!;
  }

  async signOutFromGitHub(): Promise<void> {
    await this.auth.signOut();
  }

  async fetchMySavedKeymapDataList(
    authorUid: string,
    vendorId: number,
    productId: number,
    productName: string
  ): Promise<IKeymapDataResule> {
    console.log(`${authorUid},${vendorId},${productId},${productName}`);
    const keymap: ISavedKeymapData = {
      id: 'hoge',
      title: 'title',
      desc: 'desc',
      data: { labelLang: 'ja-jp', layoutOptions: undefined, keycodes: [] },
    };

    return { success: true, keymaps: [keymap] };
  }

  async createMySavedKeymapData(
    authorUid: string,
    vendorId: number,
    productId: number,
    productName: string,
    keymap: ISavedKeymapData
  ): Promise<IResult> {
    console.log(`${authorUid},${vendorId},${productId},${productName}`);
    console.log(keymap);
    return { success: true };
  }
}
