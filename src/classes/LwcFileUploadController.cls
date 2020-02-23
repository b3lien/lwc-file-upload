public with sharing class LwcFileUploadController {

    public static List<ContentDocumentLink> relatedContentDocumentLinks;

    @AuraEnabled
    public static ContentVersion saveFile(Id recordId, String strFileName, String base64Data, String fileDescription, String fileType) {
        // Decoding base64Data
        base64Data = EncodingUtil.urlDecode(base64Data, 'UTF-8');

        // inserting file
        ContentVersion cv = new ContentVersion();
        cv.Title = strFileName;
        cv.PathOnClient = strFileName;
        cv.VersionData = EncodingUtil.base64Decode(base64Data);
        cv.IsMajorVersion = true;
        cv.FirstPublishLocationId = recordId;
        cv.Description = fileDescription;
        cv.Type__c = fileType;
        insert cv;

        return cv;
    }

    @AuraEnabled
    public static List<ContentVersion> getRelatedFiles(Id recordId) {
        List<ContentDocumentLink> cdls = [
                SELECT Id, ContentDocumentId, ContentDocument.Title
                FROM ContentDocumentLink
                WHERE LinkedEntityId = :recordId];
        relatedContentDocumentLinks = cdls;
        System.debug(cdls);
        System.debug(relatedContentDocumentLinks);

        Set<Id> contentDocumentIds = new Set<Id>();
        for (ContentDocumentLink cdl : cdls) {
            contentDocumentIds.add(cdl.ContentDocumentId);
        }

        if (!contentDocumentIds.isEmpty()) {
            return [SELECT Id, Title, Type__c, CreatedDate, FileExtension, ContentDocumentId FROM ContentVersion WHERE IsMajorVersion = true AND ContentDocumentId IN :contentDocumentIds];
        } else {
            return null;
        }
    }
}