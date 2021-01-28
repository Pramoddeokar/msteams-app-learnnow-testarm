// <copyright file="learning-module.tsx" company="Microsoft">
// Copyright (c) Microsoft. All rights reserved.
// </copyright>

import * as React from "react";
import { WithTranslation, withTranslation } from "react-i18next";
import * as microsoftTeams from "@microsoft/teams-js";
import { AxiosResponse } from "axios";
import { isNullorWhiteSpace, handleError, getTagById } from "../../helpers/helper";
import { Text, Flex, Input, Button, TextArea, Loader, ChevronStartIcon, InfoIcon, Dropdown } from "@fluentui/react-northstar";
import { TFunction } from "i18next";
import Constants from "../../constants/resources";
import { ILearningModuleDetail, IGrade, ISubject, RequestMode, IResourceDetail, IModuleResourceViewModel, ILearningModuleTag, ITag, IDropDownItem } from "../../model/type";
import { createLearningModule, getLearningModule, updateLearningModule, validateIfLearningModuleTitleExists } from '../../api/learning-module-api'
import { getAllSubjects } from "../../api/subject-api";
import { getAllGrades } from "../../api/grade-api";
import SelectImagePage from "../select-preview-image/select-preview-image"
import PreviewContent from "../preview-resource-content/preview-content-learning-module"
import LearningModuleResourceTable from "./learning-module-resource";
import LearningModuleEditPreviewItems from "./learning-module-edit-preview"
import { getResource } from "../../api/resource-api";
import { getAllTags } from "../../api/tag-api";
import Resources from "../../constants/resources";

import "../../styles/resource-content.css";

export interface ITagValidationParameters {
    isTagsCountValid: boolean;
}

interface ILearningModuleState {
    learningModuleDetail: ILearningModuleDetail,
    allSubjects: ISubject[],
    allGrades: IGrade[],
    allTags: ITag[],
    imageArray: Array<any>,
    isTitlePresent: boolean,
    isDescriptionValid: boolean,
    isGradeValid: boolean,
    isSubjectValid: boolean,
    loading: boolean,
    isSaveButtonLoading: boolean,
    isSaveButtonDisabled: boolean,
    isImageNextBtnDisabled: boolean,
    error: string
    isContentPage: boolean,
    isImagePage: boolean,
    isPreviewPage: boolean,
    isEditMode: boolean,
    editTitleText: string,
    isTitleValid: boolean,
    filteredItem: IResourceDetail[],
    userSelectedItem: string;
    filterItemEdit: IResourceDetail[],
    isGradeSubjectDisable: boolean,
    tagValidation: ITagValidationParameters,
    learningModuleTag: ILearningModuleTag[],
    windowWidth: number,
    tag: string,
    selectedTags: IDropDownItem[],
    allTagsDropDownItems: IDropDownItem[]
}

/**
* Component for rendering learning module page.
*/
class LearningModule extends React.Component<WithTranslation, ILearningModuleState> {

    localize: TFunction;
    history: any;
    telemetry?: any = null;
    userAADObjectId?: string | null = null;
    requestViewMode: string | null;
    resourceId: string | null = null;
    learningModuleId: string | null = null;
    isResourceAddMode: boolean | null = null;
    constructor(props: any) {
        super(props);
        this.localize = this.props.t;
        this.history = props.history;
        this.state = {
            learningModuleDetail: {} as ILearningModuleDetail,
            allSubjects: [],
            allGrades: [],
            allTags: [],
            imageArray: [],
            error: "",
            isTitlePresent: true,
            isDescriptionValid: true,
            isGradeValid: true,
            isSubjectValid: true,
            loading: false,
            isSaveButtonLoading: false,
            isSaveButtonDisabled: false,
            isImageNextBtnDisabled: true,
            isContentPage: true,
            isImagePage: false,
            isPreviewPage: false,
            isEditMode: false,
            editTitleText: "",
            isTitleValid: true,
            filteredItem: [],
            userSelectedItem: "",
            filterItemEdit: [],
            isGradeSubjectDisable: false,
            learningModuleTag: [],
            tagValidation: { isTagsCountValid: true, },
            windowWidth: window.innerWidth,
            tag: "",
            allTagsDropDownItems: [],
            selectedTags: [],
        }
        let search = this.history.location.search;
        let params = new URLSearchParams(search);
        this.telemetry = params.get("telemetry");
        this.requestViewMode = params.get("viewMode") ? params.get("viewMode") : "0"; // default view as add new resource.
        this.resourceId = params.get("resourceId") ? params.get("resourceId") : "";
        this.learningModuleId = params.get("resourceId") ? params.get("resourceId") : "";
        this.isResourceAddMode = params.get("addresource") ? true : false;
    }

    /**
    * Used to initialize Microsoft teams sdk and get initial data.
    */
    public componentDidMount() {
        microsoftTeams.initialize();
        microsoftTeams.getContext((context) => {
            this.userAADObjectId = context.userObjectId;
            var requestMode = RequestMode[Number(this.requestViewMode)]

            if (requestMode === Constants.editResource) {
                this.setState({ isEditMode: true, loading: true }, this.getLearningModuleDetail);
            } else if (this.isResourceAddMode) {
                this.setState({ isGradeSubjectDisable: true, loading: true }, this.getResourceDetails);
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
    * Get grade, subject and tags data for respective drop-downs.
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
    * Method to get all grades from database.
    * */
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
    * Get learning module details
    */
    private getLearningModuleDetail = async () => {
        const learningModuleDetailResponse = await getLearningModule(this.learningModuleId!);
        if (learningModuleDetailResponse.data) {
            let learningModuleDetail: IModuleResourceViewModel = learningModuleDetailResponse.data;
            if (learningModuleDetail != null) {
                let isImageNextBtnDisabled = learningModuleDetail.learningModule.imageUrl ? false : true;

                this.setState({
                    learningModuleDetail: learningModuleDetail.learningModule,
                    editTitleText: learningModuleDetail.learningModule.title.trim(),
                    filteredItem: learningModuleDetail.resources,
                    loading: false,
                    filterItemEdit: learningModuleDetail.resources,
                    isImageNextBtnDisabled: isImageNextBtnDisabled,
                    selectedTags: learningModuleDetail.learningModule.learningModuleTag.map((tag: ILearningModuleTag) => {
                        let dropDownTag: IDropDownItem = {
                            key: tag.tagId,
                            header: tag.tag.tagName
                        }
                        return dropDownTag
                    }),
                })
                let filteredItems: IResourceDetail[] = []
                if (this.state.filteredItem) {
                    this.state.filteredItem!.map((resource: IResourceDetail) => {
                        resource.checkItem = true;
                        filteredItems.push(resource);
                    });
                    this.setState({ filteredItem: filteredItems });

                    filteredItems.length > 0 ? this.setState({ isGradeSubjectDisable: true }) : this.setState({ isGradeSubjectDisable: false })
                }
            }
        }
    }

    /**
    * Method to get resource details.
    */
    private getResourceDetails = async () => {
        const resourceDataResponse = await getResource(this.resourceId!);
        if (resourceDataResponse.status === 200 && resourceDataResponse.data) {
            let resourceDetails: ILearningModuleDetail = this.state.learningModuleDetail;
            resourceDetails.title = "";
            resourceDetails.description = "";
            resourceDetails.grade = resourceDataResponse.data.grade;
            resourceDetails.subject = resourceDataResponse.data.subject;
            resourceDetails.gradeId = resourceDataResponse.data.gradeId;
            resourceDetails.subjectId = resourceDataResponse.data.subjectId;
            this.setState({
                learningModuleDetail: resourceDetails,
                loading: false
            });
        }
    }

    /**
    *Returns text component containing error message for tag input field.
    */
    private getTagError = () => {

        if (!this.state.tagValidation.isTagsCountValid) {
            return (<Text content={this.localize("tagsCountError")} error size="small" />);
        }
        return (<></>);
    }

    /**
    * Get the tag name for specified tagId.
    *@param {string} tagId selected tag's id.
    */
    private getTagById = (tagId: string) => {
        return getTagById(tagId, this.state.allTags);
    }

    /**
    * Handle grade change event.
    * @param {Any} event event object.
    * @param {string} dropdownProps props received on dropdown value click
    */
    private handleGradeChange = (event: any, dropdownProps?: any) => {
        let grade = dropdownProps.value;
        if (grade) {
            let moduleGrade: IGrade = { id: grade.key, gradeName: grade.header };
            let learningModuleDetail = Object.assign({}, this.state.learningModuleDetail);
            learningModuleDetail.gradeId = moduleGrade.id;
            learningModuleDetail.grade = moduleGrade;
            this.setState({ learningModuleDetail: learningModuleDetail, isGradeValid: true, error: "" });
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
            let moduleSubject: ISubject = { id: subject.key, subjectName: subject.header };
            let learningModuleDetail = Object.assign({}, this.state.learningModuleDetail);
            learningModuleDetail.subjectId = moduleSubject.id;
            learningModuleDetail.subject = moduleSubject;
            this.setState({ learningModuleDetail: learningModuleDetail, isSubjectValid: true, error: "" });
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

            let learningModuleTag = tag.map((dropDownItem: IDropDownItem) => {
                let learningModuleTag = {} as ILearningModuleTag;
                learningModuleTag.tagId = dropDownItem.key;
                return learningModuleTag
            });

            this.setState({ tagValidation: { isTagsCountValid: true, }, learningModuleTag: learningModuleTag });

        }
    }

    /**
    * Handle title change event.
    *@param {Any} event event details.
    */
    private handleTitleChange = (event: any) => {
        let resourceDetail = this.state.learningModuleDetail;
        resourceDetail.title = event.target.value;
        this.setState({ learningModuleDetail: resourceDetail, isTitleValid: true, error: "" });
    }

    /**
    * Handle description change event.
    */
    private handleDescriptionChange = (event: any) => {
        let resourceDetail = this.state.learningModuleDetail;
        resourceDetail.description = event.target.value;
        this.setState({ learningModuleDetail: resourceDetail, isDescriptionValid: true, error: "" });
    }

    /**
    * Handle image click event.
    */
    private handleImageClick = (url: string) => {
        let resourceDetail = this.state.learningModuleDetail;
        resourceDetail.imageUrl = url;
        this.setState({ learningModuleDetail: resourceDetail, isImageNextBtnDisabled: false });
    }

    /**
    * Set image array
    *@param {Array<any>} images image URL collection.
    */
    private setImageArray = (images: Array<any>) => {
        this.setState({ imageArray: images });
    }

    /**
    *Returns text component containing error message for failed name field validation.
    *@param {boolean} isValuePresent Indicates whether value is present or not.
    */
    private getRequiredFieldError = (isValuePresent: boolean) => {
        if (!isValuePresent) {
            return (<Text content={this.localize("emptyFieldErrorMessage")} error size="small" />);
        }

        return (<></>);
    }

    /**
    *Returns text component containing error message for failed resource title field validation.
    *@param {boolean} isTitleValid Indicates whether title is valid.
    */
    private getTitleExistsError = (isTitleValid: boolean) => {
        if (!isTitleValid) {
            return (<Text content={this.localize("resourceTitleAlreadyExists")} error size="small" />);
        }
        return (<></>);
    }

    /**
    *Validate input fields
    */
    private checkIfSubmitAllowed = async () => {
        let learningModule = this.state.learningModuleDetail;
        var isTitleValid = await this.ValidateIfTitleExists(learningModule.title);
        let isTitlePresent = true;
        let isDescriptionValid = true;
        let isSubjectValid = true;
        let isGradeValid = true;
        let isSubmitAllowed = true;

        if (learningModule.title && !isTitleValid) {
            isTitleValid = false;
        }

        if (isNullorWhiteSpace(learningModule.title)) {
            isTitlePresent = false;
        }

        if (isNullorWhiteSpace(learningModule.description)) {
            isDescriptionValid = false;
        }

        if (!learningModule.subjectId) {
            isSubjectValid = false;
        }

        if (!learningModule.gradeId) {
            isGradeValid = false;
        }


        if (!isGradeValid || !isSubjectValid || !isDescriptionValid || !isTitlePresent || !isTitleValid) {
            isSubmitAllowed = false;
        }

        this.setState({
            isTitlePresent: isTitlePresent,
            isTitleValid: isTitleValid!,
            isDescriptionValid: isDescriptionValid,
            isGradeValid: isGradeValid,
            isSubjectValid: isSubjectValid,
        });

        return isSubmitAllowed;
    }

    /**
    *Check if learning module title already exists. Returns true if title is valid.
    *@param {title} title selected title.
    */
    private ValidateIfTitleExists = async (title: string) => {
        if (title) {
            // Returns resource list with same title.
            let response = await validateIfLearningModuleTitleExists(title);
            if (response.status === 200 && response.data) {
                if (this.state.isEditMode && response.data.length === 1) {  // Edit Mode
                    return response.data[0].id === this.resourceId;
                } else {
                    return !response.data.length;
                }
            }
            return false;
        }
    }

    /**
    * Handle share button click to store resource details.
    */
    private handleShareButtonClick = async (event: any) => {
        if (await this.checkIfSubmitAllowed()) {
            let moduleData: any;
            if (this.state.isEditMode) {
                moduleData = await this.updateLearningModuleAsync() as ILearningModuleDetail;
                let isSuccess = moduleData ? Resources.successFlag : Resources.errorFlag;
                let tags = this.state.selectedTags.map((dropDownItem: IDropDownItem) => {
                    let tags: ITag = { tagName: dropDownItem.header, id: dropDownItem.key }
                    let learningModuleTag: ILearningModuleTag = {
                        tag: tags,
                        tagId: dropDownItem.key
                    }
                    return learningModuleTag
                });
                moduleData.learningModuleTag = tags;
                let details: any = { isSuccess: isSuccess, title: this.state.learningModuleDetail.title, saveResponse: moduleData }
                microsoftTeams.tasks.submitTask(details);
            }
            else {
                moduleData = await this.saveLearningModuleAsync();
                if (this.isResourceAddMode) {
                    this.history.push(`addlearningitems?gradeId=${moduleData.gradeId}&subjectId=${moduleData.subjectId}&resourceId=${this.resourceId}`);
                }
                else {
                    let isSuccess = moduleData ? Resources.successFlag : Resources.errorFlag;
                   
                    let tags = this.state.selectedTags.map((dropDownItem: IDropDownItem) => {
                        let tags: ITag = { tagName: dropDownItem.header, id: dropDownItem.key }
                        let learningModuleTag: ILearningModuleTag = {
                            tag: tags,
                            tagId: dropDownItem.key
                        }
                        return learningModuleTag
                    });
                    moduleData.grade = this.state.learningModuleDetail.grade;
                    moduleData.subject = this.state.learningModuleDetail.subject;
                    moduleData.learningModuleTag = tags
                    let details: any = { isSuccess: isSuccess, title: this.state.learningModuleDetail.title, saveResponse: moduleData }
                    microsoftTeams.tasks.submitTask(details);
                }
            }
        }
    }

    /**
    * Handle next button click on content page to on select image page.
    */
    private handleContentNextButtonClick = async (event: any) => {
        if (await this.checkIfSubmitAllowed()) {
            this.setState({ isContentPage: false, isImagePage: true, isPreviewPage: false })
        }
    }

    /**
    * Handle next button click on select image page to go to preview resource details.
    */
    private handleImageNextButtonClick = async () => {
        if (this.state.learningModuleDetail.imageUrl) {
            this.setState({ isContentPage: false, isImagePage: false, isPreviewPage: true, isImageNextBtnDisabled: false })
        }
        else {
            this.setState({ isImageNextBtnDisabled: true })
        }
    }

    /**
    * Handle back button click to go to content page.
    */
    private handleImageBackButtonClick = async (event: any) => {
        this.setState({ isContentPage: true, isImagePage: false, isPreviewPage: false })
    }

    /**
    * Handle back button click to go to add to learning module page.
    */
    private handleBackButtonClick = async (event: any) => {
        this.history.push(`addlearningitems?resourceId=${this.resourceId}`);
    }


    /**
    * Handle back button click to go to select image page page.
    */
    private handlePreviewBackButtonClick = async (event: any) => {
        this.setState({ isContentPage: false, isImagePage: true, isPreviewPage: false })
    }

    /**
    * Handle error callback to redirect to error page.
    */
    private handleErrorCallback = (url: string) => {
        this.history.push(url)
    }

    /**
    * Save module details to storage.
    */
    private saveLearningModuleAsync = async () => {
        this.setState({ isSaveButtonLoading: true, isSaveButtonDisabled: true });
        let module = this.state.learningModuleDetail;
        module.learningModuleTag = this.state.learningModuleTag

        let response: AxiosResponse<ILearningModuleDetail>;

        // Store new learning module details in storage.            
        response = await createLearningModule(module);

        if (response.status !== 200 && response.status !== 204) {
            this.setState({ isSaveButtonLoading: false, isSaveButtonDisabled: false });
            handleError(response, null, this.handleErrorCallback);
            await this.setState({ isSaveButtonLoading: false, isSaveButtonDisabled: false });
            return null;
        }

        return response.data;
    }

    /**
    * Save resource details to storage.
    */
    private updateLearningModuleAsync = async () => {
        this.setState({ isSaveButtonLoading: true, isSaveButtonDisabled: true });
        let module = Object.assign({}, this.state.learningModuleDetail);
        let moduleResources = this.state.filterItemEdit;
        module.learningModuleTag = this.state.learningModuleTag;

        let response: AxiosResponse<ILearningModuleDetail>;

        let learningModuleDetail: IModuleResourceViewModel = {
            learningModule: module,
            resources: moduleResources
        }

        // Store new resource details in storage.            
        response = await updateLearningModule(learningModuleDetail.learningModule.id, learningModuleDetail);
        if (response.status !== 200 && response.status !== 204) {
            this.setState({ isSaveButtonLoading: false, isSaveButtonDisabled: false });
            handleError(response, null, this.handleErrorCallback);
            await this.setState({ isSaveButtonLoading: false, isSaveButtonDisabled: false });
            return null;
        }

        return response.data;
    }

    /**
    * Renders learning module details when learning module is selected.
    * @param {String} resource resource identifier.
    * @param {Boolean} isSelected represents whether resource is selected or not.
    */
    private onLearningModuleSelected = (resourceId: string, isSelected: boolean) => {
        // array of resource to show in preview
        let filteredItem = this.state.filteredItem
        let filterItemEdit: IResourceDetail[] = [];
        if (isSelected) {
            let userSelectedModules = this.state.userSelectedItem;
            userSelectedModules = resourceId;
            filteredItem!.map((resource: IResourceDetail) => {
                if (resource.id === resourceId) {
                    resource.checkItem = true;
                }
            });
            this.setState({ userSelectedItem: userSelectedModules, filteredItem: filteredItem })
        }
        else {
            filteredItem!.map((resource: IResourceDetail) => {
                if (resource.id === resourceId) {
                    resource.checkItem = false;
                }
            });

            this.setState({ userSelectedItem: "" })
        }
        filteredItem!.map((resource: IResourceDetail) => {
            if (resource.checkItem) {
                filterItemEdit.push(resource);
            }

        });
        this.setState({ filterItemEdit: filterItemEdit, filteredItem: filteredItem })
    }

    /**
    * Render the component.
    */
    private renderResourcecContent() {
        return (
            <div>
                {
                    this.state.isContentPage &&
                    <div className="container-tab-lm">
                        <div className="create-content-lm">
                            <div className={this.requestViewMode == "0" || this.state.filteredItem.length == 0 ? "create-sub-div-add" : "create-sub-div"}>
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
                                            <Text className="subject-text" size="small" content={"*" + this.localize('subjectText')} />
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
                                            defaultSearchQuery={this.state.learningModuleDetail.grade ? this.state.learningModuleDetail.grade.gradeName : ""}
                                            placeholder={this.localize('gradePlaceHolderText')}
                                            noResultsMessage={this.localize("noGradeFoundError")}
                                            toggleIndicator={{ styles: { display: 'none' } }}
                                            fluid
                                            onChange={this.handleGradeChange}
                                            className="dropdown-suggestion-box"
                                            disabled={this.state.isGradeSubjectDisable}
                                        />
                                    </Flex.Item>
                                    <Flex.Item size="size.half">
                                        <Dropdown
                                            search
                                            items={this.state.allSubjects.map((subject: ISubject) => { return { key: subject.id, header: subject.subjectName } })}
                                            defaultSearchQuery={this.state.learningModuleDetail.subject ? this.state.learningModuleDetail.subject.subjectName : ""}
                                            placeholder={this.localize('subjectPlaceHolderText')}
                                            noResultsMessage={this.localize("noSubjectFoundError")}
                                            onChange={this.handleSubjectChange}
                                            toggleIndicator={{ styles: { display: 'none' } }}
                                            fluid
                                            className="dropdown-suggestion-box"
                                            disabled={this.state.isGradeSubjectDisable}
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
                                    <Input placeholder={this.localize('titlePlaceHolderText')} className="input-padding-module" fluid value={this.state.learningModuleDetail.title} onChange={(event: any) => this.handleTitleChange(event)} maxLength={Constants.titleMaxLength} /></Flex>
                                <Flex>
                                    <Text size="small" content={"*" + this.localize('descriptionText')} />
                                    <Flex.Item push>
                                        {this.getRequiredFieldError(this.state.isDescriptionValid)}
                                    </Flex.Item>
                                </Flex>
                                <Flex>
                                    <TextArea placeholder={this.localize('descriptionPlaceHolderText')} className="input-padding-description-module" fluid value={this.state.learningModuleDetail.description} onChange={this.handleDescriptionChange} maxLength={Constants.descriptionMaxLength} />
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

                                {this.state.isEditMode &&
                                    <LearningModuleResourceTable responsesData={this.state.filteredItem} onCheckBoxChecked={this.onLearningModuleSelected} isGradeSubjectDisable={this.state.isGradeSubjectDisable} windowWidth={this.state.windowWidth} />}

                            </div>
                        </div>
                        <Flex>
                            <div className="tab-footer">
                                <Flex space="between">
                                    {
                                        this.resourceId !== "" && !this.state.isEditMode &&
                                        <Flex className="back-image-button-create">
                                            <Button icon={<ChevronStartIcon />} content={this.localize("backButtonText")} text onClick={this.handleBackButtonClick} />
                                        </Flex>
                                    }
                                    {
                                        this.state.isEditMode && this.state.filteredItem.length > 0 &&
                                        <Flex className="info-div">
                                            <InfoIcon outline className="info-icon" title={this.localize("editLMValidationText")} /><Text content={this.localize("editLMValidationText")} />
                                        </Flex>
                                    }
                                    <Flex.Item push>
                                        <Button className="next-button" content={this.localize("nextButtonText")} primary loading={this.state.isSaveButtonLoading} onClick={this.handleContentNextButtonClick} disabled={this.state.isSaveButtonDisabled} />
                                    </Flex.Item>
                                </Flex>
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
                        defaultImageSearchText={this.state.learningModuleDetail!.title}
                        isImageNextBtnDisabled={this.state.isImageNextBtnDisabled}
                        existingImage={this.state.learningModuleDetail!.imageUrl}
                        windowWidth={this.state.windowWidth}
                    />
                }
                {
                    this.state.isPreviewPage && !this.state.isEditMode &&
                    <PreviewContent
                        selectedTags={this.state.selectedTags}
                        resourceDetail={this.state.learningModuleDetail}
                        showImage={true}
                        isViewOnly={true}
                        handlePreviewBackButtonClick={this.handlePreviewBackButtonClick}
                        handleShareButtonClick={this.handleShareButtonClick}
                    />
                }
                {
                    this.state.isPreviewPage && this.state.isEditMode &&
                    <Flex>
                        <LearningModuleEditPreviewItems handleShareButtonClick={this.handleShareButtonClick} handlePreviewBackButtonClick={this.handlePreviewBackButtonClick} learningModuleDetails={this.state.learningModuleDetail} responsesData={this.state.filterItemEdit} learningModuleTags={this.state.selectedTags} getTagById={this.getTagById} />
                    </Flex>
                }
            </div>
        );
    }

    /**
    * Renders the component.
    */
    public render() {
        let contents = this.state.loading
            ? <p><em><Loader /></em></p>
            : this.renderResourcecContent();
        return (
            <div>
                {contents}
            </div>
        );
    }
}
export default withTranslation()(LearningModule);