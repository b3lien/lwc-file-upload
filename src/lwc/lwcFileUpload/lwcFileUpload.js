import { LightningElement, track, api, wire } from 'lwc';
import { getObjectInfo, getPicklistValues } from 'lightning/uiObjectInfoApi';
import { deleteRecord } from 'lightning/uiRecordApi';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { NavigationMixin } from 'lightning/navigation';

import CONTENTVERSION_OBJECT from '@salesforce/schema/ContentVersion';
import CONTENTVERSION_TYPE_FIELD from '@salesforce/schema/ContentVersion.Type__c';

import saveFile from '@salesforce/apex/LwcFileUploadController.saveFile';
import getRelatedFiles from '@salesforce/apex/LwcFileUploadController.getRelatedFiles';

export default class LwcFileUpload extends NavigationMixin(LightningElement) {

    @wire(getObjectInfo, { objectApiName: CONTENTVERSION_OBJECT })
    objectInfo;
    @wire(getPicklistValues, { recordTypeId : '$objectInfo.data.defaultRecordTypeId', fieldApiName: CONTENTVERSION_TYPE_FIELD })
    typePicklistValues;
    @api recordId;
    @track files;
    @track _relatedFiles;
    @track openModal;
    @track currentFile;
    @track currentFileIndex = 0;
    @track currentFileName;
    @track _spinner;
    @track isLast = true;

    connectedCallback() {
        this._getRelatedFiles();
    }

    _showEditModal(event) {
        this.files = event.target.files;
        this.openModal = true;
        this.currentFile = this.files[this.currentFileIndex++];
        this.currentFileName = this.currentFile.name.substring(0, this.currentFile.name.lastIndexOf('.'));
    }

    _closeModal() {
        this.openModal = false;
        this.currentFileIndex = 0;
    }

    _saveFileAndShowNext() {
        if (this.currentFileIndex !== this.files.length) {
            this.currentFile = this.files[this.currentFileIndex++];
            this.currentFileName = this.currentFile.name;
        } else {
            this.uploadHelper();
            this.currentFileIndex = 0;
        }
    }

    uploadHelper() {
        // create a FileReader object
        this.fileReader= new FileReader();
        // set onload function of FileReader object
        this.fileReader.onloadend = (() => {
            this.fileContents = this.fileReader.result;
            let base64 = 'base64,';
            this.content = this.fileContents.indexOf(base64) + base64.length;
            this.fileContents = this.fileContents.substring(this.content);

            this.saveToFile();
        });

        this.fileReader.readAsDataURL(this.currentFile);
    }

    saveToFile() {
        this.uploadedFileName = this.currentFileName;
        this._spinner = true;
        let type = this.template.querySelector(`[data-id="cv_type"]`).value;
        let description = this.template.querySelector(`[data-id="cv_description"]`).value;
        saveFile({ recordId: this.recordId, strFileName: this.currentFile.name, base64Data: encodeURIComponent(this.fileContents), fileDescription: description, fileType: type})
            .then(() => {
                this._getRelatedFiles();

                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Success!!',
                        message: this.uploadedFileName + ' - Uploaded Successfully!!!',
                        variant: 'success',
                    }),
                );
            })
            .finally(() => {
                this._spinner = false;
                this.openModal = false;
            })
            .catch(error => {
                console.log(error);
                // Showing errors if any while inserting the files
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Error while uploading File',
                        message: error.message,
                        variant: 'error',
                    }),
                );
            });
    }

    _getRelatedFiles() {
        getRelatedFiles({recordId: this.recordId})
            .then(result => {
                this._relatedFiles = result;
            })
            .catch(error => {
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Error!!',
                        message: error.message,
                        variant: 'error',
                    }),
                );
            });
    }

    _toggleDropdown() {
        this.template.querySelector(`[data-id="lwc_fu_dropdown"]`).classList.toggle('slds-is-open');
    }

    _filePreview(event) {
        // Naviagation Service to the show preview
        console.log(event.target.classList);
        console.log(event.target.classList.add('added_class'));
        console.log(event.target.classList);
        this[NavigationMixin.Navigate]({
            type: 'standard__namedPage',
            attributes: {
                pageName: 'filePreview'
            },
            state : {
                // assigning ContentDocumentId to show the preview of file
                selectedRecordId: event.target.value
            }
        })
    }

    _deleteFile(event) {
        deleteRecord(event.target.value)
            .then(() => {
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Success',
                        message: 'Record deleted',
                        variant: 'success'
                    })
                );
                this._getRelatedFiles();
            })
            .catch(error => {
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Error deleting record',
                        message: error.body.message,
                        variant: 'error'
                    })
                );
            });
    }
}