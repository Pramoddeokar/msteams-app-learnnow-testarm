// <copyright file="resource-content.tsx" company="Microsoft">
// Copyright (c) Microsoft. All rights reserved.
// </copyright>

import * as React from "react";
import { WithTranslation, withTranslation } from "react-i18next";
import * as microsoftTeams from "@microsoft/teams-js";
import { AxiosResponse } from "axios";
import { isNullorWhiteSpace, handleError, getTagById, getFileName, getFileExtension } from "../../helpers/helper";
import { Text, Flex, Input, Button, Dropdown, FlexItem, TextArea, Loader } from "@fluentui/react-northstar";
import FileUploadDownload from "./../file-control/file-control";
import { TFunction } from "i18next";
import Constants from "../../constants/resources";
import ShowAttachment from "../resource-content/show-attachment"
import { createResource, getResource, updateResource, validateIfResourceTitleExists } from '../../api/resource-api'
import Resources from "../../constants/resources";
import { IResourceDetail, RequestMode, IGrade, ISubject, ITag, IResourceTag, ResourceType, IDropDownItem } from "../../model/type";
import { getAllSubjects } from "../../api/subject-api";
import { getAllTags } from "../../api/tag-api";
import { uploadFile } from "../../api/file-upload-download-api";
import { getAllGrades } from "../../api/grade-api";
import SelectImagePage from "../select-preview-image/select-preview-image"
import PreviewContent from "../preview-resource-content/preview-content"
import { FileType } from "../file-control/file-types";

import "../../styles/resource-content.css";

export interface ITagValidationParameters {
    isTagsCountValid: boolean;
}

interface IResourceContentState {
    resourceDetail: IResourceDetail,
    typeOfResource: string,
    subject: string,
    grade: string,
    allSubjects: ISubject[],
    allGrades: IGrade[],
    allTags: ITag[],
    imageArray: Array<any>,
    isTypeOfResourcePresent: boolean,
    isTypeOfResourceValid: boolean,
    isTitlePresent: boolean,
    isTitleValid: boolean,
    isDescriptionValid: boolean,
    isGradeValid: boolean,
    isSubjectValid: boolean,
    isLinkValid: boolean,
    isAttachmentValid: boolean,
    resourceTag: IResourceTag[];
    tagValidation: ITagValidationParameters;
    fileName: string;
    fileExtension: string
    showAttachment: boolean,
    loading: boolean,
    isSaveButtonLoading: boolean,
    isSaveButtonDisabled: boolean,
    isImageNextBtnDisabled: boolean,
    error: string
    fileToUpload: FormData,
    isFileValid: boolean,
    isFileFormatValid: boolean,
    isEditMode: boolean,
    isContentPage: boolean,
    isImagePage: boolean,
    isPreviewPage: boolean,
    isUploadDisable: boolean,
    isLinkDisable: boolean,
    windowWidth: number,
    tag: string | undefined,
    selectedTags: IDropDownItem[],
    allTagsDropDownItems: IDropDownItem[]
}

/**
* Component for rendering resource details page.
*/
class ResourceContent extends React.Component<WithTranslation, IResourceContentState> {
    localize: TFunction;
    telemetry?: any = null;
    userAADObjectId?: string | null = null;
    requestViewMode: string | null;
    resourceId: string | null = null;
    history: any

    constructor(props: any) {
        super(props);
        this.localize = this.props.t;
        this.state = {
            resourceDetail: {} as IResourceDetail,
            typeOfResource: "",
            subject: "",
            allSubjects: [],
            grade: "",
            allGrades: [],
            allTags: [],
            imageArray: [],
            error: "",
            isTypeOfResourcePresent: true,
            isTypeOfResourceValid: true,
            isTitleValid: true,
            isTitlePresent: true,
            isDescriptionValid: true,
            isGradeValid: true,
            isSubjectValid: true,
            isLinkValid: true,
            isUploadDisable: false,
            isAttachmentValid: true,
            isFileValid: true,
            isFileFormatValid: true,
            resourceTag: [],
            tagValidation: { isTagsCountValid: true },
            fileName: "",
            fileExtension: "",
            showAttachment: false,
            loading: true,
            isSaveButtonLoading: false,
            isSaveButtonDisabled: false,
            isImageNextBtnDisabled: true,
            fileToUpload: new FormData(),
            isEditMode: false,
            isContentPage: true,
            isImagePage: false,
            isPreviewPage: false,
            isLinkDisable: false,
            windowWidth: window.innerWidth,
            tag: undefined,
            selectedTags: [],
            allTagsDropDownItems: []
        }

        let search = props.history.location.search;
        let params = new URLSearchParams(search);
        this.requestViewMode = params.get("viewMode") ? params.get("viewMode") : "0"; // default view as add new resource.
        this.resourceId = params.get("resourceId") ? params.get("resourceId") : "";
        this.history = props.history;
    }

    /**
    * Used to initialize microsoft teams sdk and get initial set of data.
    */
    public async componentDidMount() {
        microsoftTeams.initialize();
        microsoftTeams.getContext((context) => {
            this.userAADObjectId = context.userObjectId;
            var requestMode = RequestMode[Number(this.requestViewMode)]

            // If in edit mode get resource details.
            if (requestMode === Constants.editResource) {
                this.setState({ isEditMode: true });
                this.getResourceDetails();
            }

            // Fetch data for grade, tags and subjects for drop down.
            this.getDropDownData();

        });
    }

    public componentWillUnmount() {
        window.removeEventListener('resize', this.update);
    }

    /**
    * Get screen width real time
    */
    private update = () => {
        if (window.innerWidth !== this.state.windowWidth) {
            this.setState({ windowWidth: window.innerWidth });
        }
    };

    /**
    * Set grade, subject, tag dropdown data.
    */
    private getDropDownData = async () => {

        // Fetch grades.
        await this.getGrades();

        // Fetch subjects
        await this.getSubjects();

        //Fetch Tags
        await this.getTags();

        this.setState({ loading: false })
    }

    /**
    * Method to get resource details.
    */
    private getResourceDetails = async () => {
        let showAttachment = false;
        this.setState({ loading: true })
        const resourceDetailsResponse = await getResource(this.resourceId!);
        if (resourceDetailsResponse.status === 200 && resourceDetailsResponse.data) {
            let resourceDetails: IResourceDetail = resourceDetailsResponse.data

            if (!isNullorWhiteSpace(resourceDetails.attachmentUrl) && resourceDetails.attachmentUrl) {
                this.getFileName(resourceDetails.attachmentUrl);
                showAttachment = true
            }

            let grade = resourceDetails.grade.gradeName;
            let subject = resourceDetails.subject.subjectName;
            let isImageButtonDisable = resourceDetails.imageUrl ? false : true;
            this.setState({
                resourceDetail: resourceDetails,
                resourceTag: resourceDetails.resourceTag,
                selectedTags: resourceDetails.resourceTag.map((tag: IResourceTag) => {
                    let dropDownTag: IDropDownItem = {
                        key: tag.tagId,
                        header: tag.tag.tagName
                    }
                    return dropDownTag
                }),
                grade: grade,
                subject: subject,
                isImageNextBtnDisabled: isImageButtonDisable,
                showAttachment: showAttachment,
                loading: false
            });
            return;
        }
        this.setState({ loading: false });
    }

    /**
    * Method to get all grades from database.
    */
    private getGrades = async () => {
        const gradesResponse = await getAllGrades(this.handleAuthenticationFailure);
        if (gradesResponse.status === 200 && gradesResponse.data) {
            this.setState({ allGrades: gradesResponse.data });
        }
    }

    /**
    * Method to get all subjects from database.
    */
    private getSubjects = async () => {
        const subjectResponse = await getAllSubjects(this.handleAuthenticationFailure);
        if (subjectResponse.status === 200 && subjectResponse.data) {
            this.setState({ allSubjects: subjectResponse.data });
        }
    }

    /**
    * Method to get all tags from database.
    */
    private getTags = async () => {
        const tagsResponse = await getAllTags(this.handleAuthenticationFailure);
        if (tagsResponse.status === 200 && tagsResponse.data) {
            let allTags: IDropDownItem[] = tagsResponse.data.map((tag: ITag) => { return { key: tag.id, header: tag.tagName } });
            this.setState({ allTags: tagsResponse.data, allTagsDropDownItems: allTags });
        }
    }

    /**
    * handle error occurred during authentication
    */
    private handleAuthenticationFailure = (error: string) => {
        // When the getAuthToken function returns a "resourceRequiresConsent" error, 
        // it means Azure AD needs the user's consent before issuing a token to the app. 
        // The following code redirects the user to the "Sign in" page where the user can grant the consent. 
        // Right now, the app redirects to the consent page for any error.
        console.error("Error from getAuthToken: ", error);
        this.history.push('/signin');
    }

    /**
    * Handle type of resource change event.
    * @param {any} dropdownProps selected grade.
    */
    private handleTypeOfResourceChange = (event: any, dropdownProps?: any) => {
        this.setState({ isUploadDisable: false });

        let resourceDetail = Object.assign({}, this.state.resourceDetail);
        resourceDetail.resourceType = Number(ResourceType[dropdownProps.value]);

        //If resource type is selected as external link.
        if (resourceDetail.resourceType === 5) {
            this.setState({ isUploadDisable: true, resourceDetail: resourceDetail, isTypeOfResourceValid: true, isTypeOfResourcePresent: true, showAttachment: false });
            return;
        }
        this.setState({ resourceDetail: resourceDetail, isTypeOfResourceValid: true, isTypeOfResourcePresent: true });
    }

    /**
     * Handle grade change event.
     * @param {Any} event event object.
    * @param {string} dropdownProps props received on dropdown value click
     */
    private handleGradeChange = (event: any, dropdownProps?: any) => {
        let grade = dropdownProps.value;
        if (grade) {
            let resourceDetail = Object.assign({}, this.state.resourceDetail);
            resourceDetail.gradeId = grade.key;
            this.setState({ resourceDetail: resourceDetail, grade: grade.header, isGradeValid: true, error: "" });
        }
    }

    /**
    * Handle subject change event.
    * @param {Any} event event object.
    * @param {string} dropdownProps props received on dropdown value click
    */
    private handleSubjectChange = (event: any, dropdownProps?: any) => {
        let subject = dropdownProps.value;
        if (subject) {
            let resource = Object.assign({}, this.state.resourceDetail);
            resource.subjectId = subject.key;
            this.setState({ resourceDetail: resource, subject: subject.header, isSubjectValid: true, error: "" });
        }
    }

    /**
    * Handle tag change event.
    * @param {Any} event event object.
    * @param {string} dropdownProps props received on dropdown value click
    */
    private handleTagChange = (event: any, dropdownProps?: any) => {
        debugger;
        let tag = dropdownProps.value;
        if (tag.length > Resources.tagsMaxCount) {
            this.setState({ tagValidation: { isTagsCountValid: false } })
            return;
        }
        if (tag) {
            this.setState({ selectedTags: tag });

            let resourceTags = tag.map((dropDownItem: IDropDownItem) => {
                let resourceTag = {} as IResourceTag;
                resourceTag.tagId = dropDownItem.key;
                return resourceTag
            });

            this.setState({ tagValidation: { isTagsCountValid: true, }, resourceTag: resourceTags });

        }
    }

    /**
    * Get the tag name for specified tagId.
    * @param {string} tagId selected tag's id.
    */
    private getTagById = (tagId: string) => {
        return getTagById(tagId, this.state.allTags);
    }

    /**
    * Handle title change event.
    * @param {Any} event event object.
    */
    private handleTitleChange = (event: any) => {
        let resource = Object.assign({}, this.state.resourceDetail);
        resource.title = event.target.value;
        this.setState({ resourceDetail: resource, isTitleValid: true, isTitlePresent: true, error: "" });
    }

    /**
    * Handle description change event.
    * @param {Any} event event object.
    */
    private handleDescriptionChange = (event: any) => {
        let resource = Object.assign({}, this.state.resourceDetail);
        resource.description = event.target.value;
        this.setState({ resourceDetail: resource, isDescriptionValid: true, error: "" });
    }

    /**
    * Handle link change event.
    * @param {Any} event event object.
    */
    private handleLinkChange = (event: any) => {
        let resource = Object.assign({}, this.state.resourceDetail);
        resource.linkUrl = event.target.value;

        if (!resource.linkUrl) {
            this.setState({ isUploadDisable: false, resourceDetail: resource });
            return
        }
        this.setState({ resourceDetail: resource, isLinkValid: true, error: "", isAttachmentValid: true });
    }

    /**
    * Handle image click event.
    * @param {string} url selected image URL.
    */
    private handleImageClick = (url: string) => {
        let resource = Object.assign({}, this.state.resourceDetail);
        resource.imageUrl = url
        this.setState({ resourceDetail: resource, isImageNextBtnDisabled: false });
    }

    /**
    * Set the state whether attachment is valid or invalid.
    * @param {boolean} isFileValid Indicates whether file is valid.
    */
    private setFileUploadError = (isFileValid: boolean) => {
        this.setState({ isFileValid: isFileValid, isAttachmentValid: true });
    }

    /**
    * Set the state whether attachment file format is valid or invalid.
    * @param {boolean} isFileFormatValid Indicates whether file format is valid.
    */
    private setFileFormatError = (isFileFormatValid: boolean) => {
        this.setState({ isFileFormatValid: isFileFormatValid });
    }

    /**
    * Sets image array.
    * @param {Array<any>} images Array of selected images.
    */
    private setImageArray = (images: Array<any>) => {
        this.setState({ imageArray: images });
    }

    /**
    * Check if resource type is valid or not.
    * @param {resourceType} resourceType selected resource type.
    */
    private validateResourceType = async (resourceType: ResourceType) => {

        let fileExtension = this.state.fileExtension;

        if (fileExtension === "" && this.state.resourceDetail.linkUrl) {
            return resourceType === 5
        }

        switch (fileExtension.toLowerCase()) {
            case FileType.PPTX:
            case FileType.PPT: {
                return resourceType === 1
            }
            case FileType.XLSX:
            case FileType.XLS: {
                return resourceType === 2
            }

            case FileType.DOC:
            case FileType.DOCX: {
                return resourceType === 3
            }

            case FileType.PDF: {
                return resourceType === 4
            }

            default: {
                return resourceType === 5
            }
        }
    }

    /**
    * Check if link is valid
    * @param {link} link selected link.
    */
    private isLinkValid = (link: string) => {
        return link && link.match(Constants.urlValidationRegEx);
    }

    /**
    * Check if resource title already exists. Returns true if title is valid.
    * @param {String} title selected title.
    */
    private validateIfTitleExists = async (title: string) => {
        if (title) {
            // Returns resource list with same title.
            let response = await validateIfResourceTitleExists(title);
            if (response.status === 200 && response.data) {
                if (this.state.isEditMode && response.data.length === 1) {  // Edit Mode
                    return response.data[0].id === this.resourceId ? true : false;
                } else {
                    return response.data.length ? false : true;
                }
            }
            return false;
        }
    }

    /**
    * Returns text component containing error message for failed name field validation
    * @param {Boolean} isValuePresent Indicates whether value is present
    */
    private getRequiredFieldError = (isValuePresent: boolean) => {
        if (!isValuePresent) {
            return (<Text content={this.localize("emptyFieldErrorMessage")} error size="small" />);
        }
        return (<></>);
    }

    /**
    * Returns text component containing error message for failed attachment field validation
    * @param {Boolean} isFileValid Indicates whether file is valid.
    */
    private getFileUploadError = (isFileValid: boolean) => {
        if (!isFileValid) {
            return (<Text content={this.localize("fileSizeErrorMessage")} error size="small" />);
        }
        return (<></>);
    }

    /**
    * Returns text component containing error message for failed attachment field validation
    * @param {Boolean} isFileValid Indicates whether file is valid.
    */
    private getFileFormatError = (isFileFormatValid: boolean) => {
        if (!isFileFormatValid) {
            return (<Text content={this.localize("fileFormatErrorMessage")} error size="small" />);
        }
        return (<></>);
    }

    /**
    * Returns text component containing error message for failed link field validation
    * @param {Boolean} isLinkValid Indicates whether link is valid.
    */
    private getLinkURLError = (isLinkValid: boolean) => {
        if (!isLinkValid) {
            return (<Text content={this.localize("linkURLErrorMessage")} error size="small" />);
        }
        return (<></>);
    }

    /**
    * Returns text component containing error message for failed resource type field validation
    * @param {Boolean} isTypeOfResourceValid Indicates whether resource type is valid or not.
    */
    private getResourceTypeError = (isTypeOfResourceValid: boolean) => {
        if (!isTypeOfResourceValid) {
            return (<Text content={this.localize("resourceTypeErrorMessage")} error size="small" />);
        }
        return (<></>);
    }

    /**
    * Returns text component containing error message for failed resource title field validation
    * @param {Boolean} isTitleValid Indicates whether title is valid or not.
    */
    private getTitleExistsError = (isTitleValid: boolean) => {
        if (!isTitleValid) {
            return (<Text content={this.localize("resourceTitleAlreadyExists")} error size="small" />);
        }
        return (<></>);
    }

    /**
    * Returns text component containing error message for tag input field.
    */
    private getTagError = () => {

        if (!this.state.tagValidation.isTagsCountValid) {
            return (<Text content={this.localize("tagsCountError")} error size="small" />);
        }

        return (<></>);
    }

    /**
    * Validate input fields on next button click of content page.
    */
    private checkIfSubmitAllowed = async () => {
        let resourceDetail = this.state.resourceDetail;
        var isTitleValid = await this.validateIfTitleExists(resourceDetail.title);
        let isTitlePresent = true;
        var isTypeOfResourceValid = await this.validateResourceType(resourceDetail.resourceType);
        let isTypeOfResourcePresent = true;
        let isDescriptionValid = true;
        let isSubjectValid = true;
        let isAttachmentValid = true;
        let isGradeValid = true;
        let isLinkValid = true;
        let isSubmitAllowed = true;

        this.setState({ isSaveButtonLoading: true, isSaveButtonDisabled: true });

        if (isNullorWhiteSpace(resourceDetail.title)) {
            isTitlePresent = false;
        }

        if (resourceDetail.title && !isTitleValid) {
            isTitleValid = false;
        }

        if (!resourceDetail.resourceType) {
            isTypeOfResourcePresent = false;
        }

        // If file is uploaded.
        if (resourceDetail.resourceType && !isNullorWhiteSpace(this.state.fileExtension) && !isTypeOfResourceValid) {
            isTypeOfResourceValid = false;
        }

        if (isNullorWhiteSpace(resourceDetail.description)) {
            isDescriptionValid = false;
        }

        if (!resourceDetail.subjectId) {
            isSubjectValid = false;
        }

        if (isNullorWhiteSpace(resourceDetail.linkUrl) && isNullorWhiteSpace(this.state.fileName)) {
            isAttachmentValid = false;
        }
        if (!resourceDetail.gradeId) {
            isGradeValid = false;
        }
        if (resourceDetail.linkUrl && !this.isLinkValid(resourceDetail.linkUrl)) {
            isLinkValid = false;
        }

        if (!isGradeValid || !isSubjectValid || !isDescriptionValid || !isTitlePresent || !isAttachmentValid || !isLinkValid || !isTitleValid || !isTypeOfResourceValid || !isTypeOfResourcePresent) {
            isSubmitAllowed = false;
        }

        this.setState({
            isTitlePresent: isTitlePresent,
            isTitleValid: isTitleValid!,
            isTypeOfResourcePresent: isTypeOfResourcePresent,
            isTypeOfResourceValid: isTypeOfResourceValid,
            isDescriptionValid: isDescriptionValid,
            isGradeValid: isGradeValid,
            isSubjectValid: isSubjectValid,
            isAttachmentValid: isAttachmentValid,
            isLinkValid: isLinkValid,
        });
        return isSubmitAllowed;
    }

    /**
    * Set attachment filename.
    * @param {String} file path.
    */
    private getFileName = (filePath: string) => {
        let fileName = getFileName(filePath);
        let fileExtension = getFileExtension(filePath);
        this.setState({ fileName: fileName, showAttachment: true, fileExtension: fileExtension });
    }

    /**
    * Handle remove attachment click on close icon.
    */
    private removeFileAttachment = async () => {
        this.setState({ showAttachment: false, fileName: "", fileExtension: "" });
    }

    /**
    * Set file attachment details.
    * @param {String} fileName name of the file.
    * @param {String} fileExtension file extension.
    * @param {String} fileToUpload file form data details.
    */
    private setUploadedFileInformation = (fileName: string, fileExtension: string, fileToUpload: FormData) => {
        this.setState({
            fileToUpload: fileToUpload, showAttachment: true, isFileFormatValid: true,
            isFileValid: true, fileName: fileName, fileExtension: fileExtension
        });
    }

    /**
    * Method to upload file to blob.
    */
    private uploadFileToBlob = async () => {
        let fileToUpload: FormData = this.state.fileToUpload;
        const uploadFileApiResponse = await uploadFile(fileToUpload);
        if (uploadFileApiResponse) {
            let uploadedFileInfo = uploadFileApiResponse.data;

            let resourceDetail = this.state.resourceDetail;
            resourceDetail.attachmentUrl = uploadedFileInfo;
            this.setState({ resourceDetail: resourceDetail });
            return true
        }
        return false;
    }

    /**
    * Handle next button change event.
    */
    private handleSaveButtonClick = async () => {

        // Upload attachment to blob.
        if (this.state.fileName && this.state.fileToUpload.has("FileInfo")) {
            await this.uploadFileToBlob();
        }

        if (!this.state.showAttachment) {
            let resource = Object.assign({}, this.state.resourceDetail);
            resource.attachmentUrl = "";
            this.setState({ resourceDetail: resource })
        }

        // Save or update resources to storage.
        let saveResourceResponse = await this.saveResourceAsync() as IResourceDetail;

        if (saveResourceResponse) {

            saveResourceResponse.grade = {
                gradeName: this.state.grade
            }
            saveResourceResponse.subject = {
                subjectName: this.state.subject
            }

            let tags = this.state.selectedTags.map((dropDownItem: IDropDownItem) => {
                let tags: ITag = { tagName: dropDownItem.header, id: dropDownItem.key }
                let resourceTag: IResourceTag = {
                    tag: tags,
                    tagId: dropDownItem.key
                }
                return resourceTag
            });

            saveResourceResponse.resourceTag = tags;
        }
        let isSuccess = saveResourceResponse ? Resources.successFlag : Resources.errorFlag;       
        let details: any = { isSuccess: isSuccess, title: this.state.resourceDetail.title, saveResponse: saveResourceResponse }
        microsoftTeams.tasks.submitTask(details);
    }

    /**
    * Handle next button click on resource content page .
    */
    private handleContentNextButtonClick = async () => {
        if (await this.checkIfSubmitAllowed()) {
            this.setState({ isContentPage: false, isImagePage: true, isPreviewPage: false });
        }
    }

    /**
    * Handle next button click on image selection page .
    */
    private handleImageNextButtonClick = async () => {
        if (this.state.resourceDetail.imageUrl) {
            this.setState({ isContentPage: false, isImagePage: false, isPreviewPage: true, isImageNextBtnDisabled: false })
        }
        else {
            this.setState({ isImageNextBtnDisabled: true })
        }
    }

    /**
    * Handle back button click on image selection page .
    */
    private handleImageBackButtonClick = async () => {
        this.setState({ isContentPage: true, isImagePage: false, isPreviewPage: false, tagValidation: { isTagsCountValid: true } });
    }

    /**
    * Handle error callback to redirect to error page.
    */
    private handleErrorCallback = (url: string) => {
        this.history.push(url)
    }


    /**
    * Handle back button click on preview page .
    */
    private handlePreviewBackButtonClick = async () => {
        this.setState({ isContentPage: false, isImagePage: true, isPreviewPage: false })
    }

    /**
    * Save resource details to storage.
    */
    private saveResourceAsync = async () => {
        this.setState({ isSaveButtonLoading: true, isSaveButtonDisabled: true });
        let resource = Object.assign({}, this.state.resourceDetail);
        resource.resourceTag = this.state.resourceTag;
        resource.fileType = 0;

        let response: AxiosResponse<IResourceDetail>;
        if (this.state.isEditMode) {

            // Update resource details in storage.   
            response = await updateResource(resource, resource.id);
        }
        else {

            // Store new resource details in storage.            
            response = await createResource(resource);
        }

        if (response.status !== 200 && response.status !== 204) {
            this.setState({ isSaveButtonLoading: false, isSaveButtonDisabled: false });
            handleError(response, null, this.handleErrorCallback);
            await this.setState({ isSaveButtonLoading: false, isSaveButtonDisabled: false });
            return false;
        }
        this.setState({ isSaveButtonLoading: false, isSaveButtonDisabled: false });

        return response.data;
    }

    /**
    * Renders the component.
    */
    private renderResourceContent() {
        let resourceTypeDropDownItems = Object.keys(ResourceType).filter(k => isNaN(Number(k))); //get resource types named values from numeric enum
        return (
            <div>
                {this.state.isContentPage &&
                    <div className="container-tab ">
                        <Flex>
                            <div className="create-content-main">
                                <div className="create-sub-div-resource">
                                    <Flex>
                                        <Text size="small" content={"*" + this.localize('typeOfResourceText')} />
                                        <Flex.Item push>
                                            {this.getRequiredFieldError(this.state.isTypeOfResourcePresent)}
                                        </Flex.Item>
                                        <Flex.Item push>
                                            {this.state.isTypeOfResourcePresent ?
                                                this.getResourceTypeError(this.state.isTypeOfResourceValid) : <></>
                                            }
                                        </Flex.Item>
                                    </Flex>
                                    <Dropdown
                                        fluid
                                        className="input-padding"
                                        items={resourceTypeDropDownItems}
                                        placeholder={this.localize('typeOfResourcePlaceHolderText')}
                                        checkable
                                        onChange={this.handleTypeOfResourceChange}
                                        value={ResourceType[Number(this.state.resourceDetail.resourceType)]}
                                    />

                                    <Flex gap="gap.small">
                                        <Flex.Item size="size.half">
                                            <Flex>
                                                <Text size="small" content={"*" + this.localize('gradeText')} />
                                                <Flex.Item push>
                                                    {this.getRequiredFieldError(this.state.isGradeValid)}
                                                </Flex.Item>
                                            </Flex>
                                        </Flex.Item>
                                        <Flex.Item size="size.half">
                                            <Flex>
                                                <Text size="small" content={"*" + this.localize('subjectText')} />
                                                <Flex.Item push>
                                                    {this.getRequiredFieldError(this.state.isSubjectValid)}
                                                </Flex.Item>
                                            </Flex>
                                        </Flex.Item>
                                    </Flex>
                                    <Flex gap="gap.small" className="input-padding">
                                        <Flex.Item size="size.half">
                                            <Dropdown
                                                search
                                                items={this.state.allGrades.map((grade: IGrade) => { return { key: grade.id, header: grade.gradeName } })}
                                                defaultSearchQuery={this.state.resourceDetail.grade ? this.state.resourceDetail.grade.gradeName : ""}
                                                placeholder={this.localize('gradePlaceHolderText')}
                                                noResultsMessage={this.localize("noGradeFoundError")}
                                                toggleIndicator={{ styles: { display: 'none' } }}
                                                fluid
                                                onChange={this.handleGradeChange}
                                                className="dropdown-suggestion-box"
                                            />
                                        </Flex.Item>
                                        <Flex.Item size="size.half">
                                            <Dropdown
                                                search
                                                items={this.state.allSubjects.map((subject: ISubject) => { return { key: subject.id, header: subject.subjectName } })}
                                                defaultSearchQuery={this.state.resourceDetail.subject ? this.state.resourceDetail.subject.subjectName : ""}
                                                placeholder={this.localize('subjectPlaceHolderText')}
                                                noResultsMessage={this.localize("noSubjectFoundError")}
                                                onChange={this.handleSubjectChange}
                                                toggleIndicator={{ styles: { display: 'none' } }}
                                                fluid
                                                className="dropdown-suggestion-box"
                                            />
                                        </Flex.Item>
                                    </Flex>
                                    <Flex>
                                        <Text size="small" content={"*" + this.localize('titleText')} />
                                        <Flex.Item push>
                                            {this.getRequiredFieldError(this.state.isTitlePresent)}
                                        </Flex.Item>
                                        <Flex.Item push>
                                            {this.state.isTitlePresent ?
                                                this.getTitleExistsError(this.state.isTitleValid) : <></>
                                            }
                                        </Flex.Item>
                                    </Flex>
                                    <Flex>
                                        <Input placeholder={this.localize('titlePlaceHolderText')} className="input-padding" fluid value={this.state.resourceDetail.title} onChange={(event: any) => this.handleTitleChange(event)} maxLength={Resources.titleMaxLength} /></Flex>
                                    <Flex>
                                        <Text size="small" content={"*" + this.localize('descriptionText')} />
                                        <Flex.Item push>
                                            {this.getRequiredFieldError(this.state.isDescriptionValid)}
                                        </Flex.Item>
                                    </Flex>
                                    <Flex>
                                        <TextArea fluid placeholder={this.localize('descriptionPlaceHolderText')} className="input-padding-description" value={this.state.resourceDetail.description} onChange={this.handleDescriptionChange} maxLength={Resources.descriptionMaxLength} /></Flex>
                                    <Flex>
                                        <Text size="small" content={this.localize('linkText')} />
                                        <Flex.Item push>
                                            {this.getLinkURLError(this.state.isLinkValid)}
                                        </Flex.Item>
                                        <Flex.Item push>
                                            {this.getRequiredFieldError(this.state.isAttachmentValid)}
                                        </Flex.Item>
                                    </Flex>
                                    <Flex>
                                        <Input placeholder={this.localize('linkPlaceHolderText')} className="input-padding" fluid value={this.state.resourceDetail.linkUrl} onChange={this.handleLinkChange} maxLength={Resources.linkMaxLength} />
                                    </Flex>
                                    <Flex className="file-format-validation">
                                        <Flex.Item push>
                                            {this.getFileUploadError(this.state.isFileValid)}
                                        </Flex.Item>
                                        <Flex.Item push>
                                            {this.state.isFileValid ?
                                                this.getFileFormatError(this.state.isFileFormatValid) : <></>
                                            }
                                        </Flex.Item>
                                    </Flex>
                                    <Flex gap="gap.small" className="input-padding-attachment">
                                        <Flex.Item>
                                            {this.state.showAttachment ?
                                                <ShowAttachment fileName={this.state.fileName} isViewOnly={false} showAttachment={this.state.showAttachment} removeFileAttachment={this.removeFileAttachment} adjustWidth={false} />
                                                :
                                                <div></div>
                                            }
                                        </Flex.Item>
                                        <FlexItem push>
                                            <div className="or-text-padding">{this.localize('orText')}</div>
                                        </FlexItem>
                                        <Flex.Item>
                                            <div>
                                                <FileUploadDownload
                                                    getFileName={this.getFileName}
                                                    localizer={this.localize}
                                                    setUploadedFileInformation={this.setUploadedFileInformation}
                                                    setFileUploadError={this.setFileUploadError}
                                                    setFileFormatError={this.setFileFormatError}
                                                    isUploadDisable={this.state.isUploadDisable}
                                                />
                                            </div>
                                        </Flex.Item>
                                    </Flex>
                                    <Flex className="tag-padding">
                                        <Text size="small" content={this.localize('tagsText')} />
                                        <Flex.Item push>
                                            {this.getTagError()}
                                        </Flex.Item>
                                    </Flex>
                                    <Dropdown
                                        multiple
                                        search
                                        items={this.state.allTagsDropDownItems}
                                        placeholder={this.localize('tagPlaceholderText')}
                                        noResultsMessage={this.localize("noTagFoundError")}
                                        toggleIndicator={{ styles: { display: 'none' } }}
                                        fluid
                                        onChange={(e, selectedOption) => { this.handleTagChange(e, selectedOption) }}
                                        className="tag-dropdown-input"
                                        value={this.state.selectedTags}
                                    />
                                </div>
                            </div>
                        </Flex>
                        <Flex>
                            <div className="tab-footer">
                                <div>
                                    <Flex space="between">
                                        <Flex.Item push>
                                            <Button className="next-button" content={this.localize("nextButtonText")} primary onClick={this.handleContentNextButtonClick} />
                                        </Flex.Item>
                                    </Flex>
                                </div>
                            </div>
                        </Flex>
                    </div>
                }
                {
                    this.state.isImagePage &&
                    <SelectImagePage
                        handleImageNextButtonClick={this.handleImageNextButtonClick}
                        handleImageBackButtonClick={this.handleImageBackButtonClick}
                        handleImageClick={this.handleImageClick}
                        setImageArray={this.setImageArray}
                        imageArray={this.state.imageArray}
                        isImageNextBtnDisabled={this.state.isImageNextBtnDisabled}
                        defaultImageSearchText={this.state.resourceDetail!.title}
                        existingImage={this.state.resourceDetail.imageUrl}
                        windowWidth={this.state.windowWidth}
                    />
                }
                {
                    this.state.isPreviewPage &&
                    <PreviewContent
                        fileName={this.state.fileName}
                        resourceDetail={this.state.resourceDetail}
                        resourceTags={this.state.resourceTag}
                        subject={this.state.subject}
                        grade={this.state.grade}
                        showAttachment={this.state.showAttachment}
                        showImage={true}
                        isViewOnly={true}
                        handlePreviewBackButtonClick={this.handlePreviewBackButtonClick}
                        handleSaveButtonClick={this.handleSaveButtonClick}
                        getTagById={this.getTagById}
                    />
                }
            </div>
        );
    }

    /**
    * Renders the component.
    */
    public render() {
        let contents = this.state.loading
            ? <p><Loader /></p>
            : this.renderResourceContent();
        return (
            <div>
                {contents}
            </div>
        );
    }
}
export default withTranslation()(ResourceContent);