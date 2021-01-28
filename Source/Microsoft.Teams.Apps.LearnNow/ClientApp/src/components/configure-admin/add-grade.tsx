﻿// <copyright file="add-grade.tsx" company="Microsoft">
// Copyright (c) Microsoft. All rights reserved.
// </copyright>

import * as React from "react";
import { Button, Flex, Text, Input, ChevronStartIcon } from "@fluentui/react-northstar";
import { createGrade } from "../../api/grade-api";
import { WithTranslation, withTranslation } from "react-i18next";
import { TFunction } from "i18next";
import Resources from "../../constants/resources";
import ErrorMessage from "../error-message";

import "../../styles/admin-configure-wrapper-page.css";

interface IAddGradeState {
    loader: boolean;
    grade: string;
    isGradeValuePresent: boolean;
    isSubmitLoading: boolean;
    isGradeTitleExists: boolean;
    showErrorMessage: boolean;
}

/**
* This Component is used in messaging extension action task module for adding new grade.
*/
class AddGrade extends React.Component<WithTranslation, IAddGradeState> {
    localize: TFunction;
    history: any

    constructor(props: any) {
        super(props);
        this.localize = this.props.t;
        this.state = {
            grade: "",
            isGradeValuePresent: true,
            loader: false,
            isSubmitLoading: false,
            isGradeTitleExists: false,
            showErrorMessage: false
        }

        this.history = props.history;
    }

    /**
    * Set State value of grade text box input control
    * @param {Any} event Object which describes event occurred
    */
    private onGradeValueChange = (event: any) => {
        this.setState({ grade: event.target.value, isGradeValuePresent: true, isGradeTitleExists: false });
    }

    /**
    * Triggers when user clicks back button
    */
    private onBackButtonClick = () => {
        this.history.goBack();
    }

    /**
    * Checks whether all validation conditions are matched before user submits new grade request
    */
    private checkIfSubmitAllowed = () => {
        if (this.state.grade) {
            return true;
        } else {
            this.setState({ isGradeValuePresent: false });
            return false;
        }
    }

    /**
    * Submits and adds new grade
    */
    private onAddButtonClick = async () => {
        if (this.checkIfSubmitAllowed()) {
            this.setState({ showErrorMessage: false, isSubmitLoading: true });
            let details = { gradeName: this.state.grade };
            const postGradeResponse = await createGrade(details);
            if (postGradeResponse.status === 200 && postGradeResponse.data) {
                this.history.goBack();
            } else if (postGradeResponse.status === 409) {
                this.setState({ isGradeTitleExists: true, isSubmitLoading: false });
            } else {
                this.setState({ showErrorMessage: true, isSubmitLoading: false });
            }
        }
    }

    /**
    * Renders the component
    */
    public render(): JSX.Element {
        return (
            <>
                {this.getWrapperPage()}
            </>
        );
    }

    /**
    * Get wrapper for page which acts as container for all child components
    */
    private getWrapperPage = () => {
        return (
            <div className="add-new-grade-page">
                <Text content={this.localize("adminCreateGradeTitleLabelText")} size="medium" />
                <div className="add-form-container">
                    <Flex gap="gap.small">
                        <Text content={this.localize("adminCreateGradeLabelText")} size="medium" />
                    </Flex>
                    <div className="add-form-input">
                        <Input placeholder={this.localize("adminTextGradeInputPlaceholder")} fluid required maxLength={Resources.gradeInputMaxLength} value={this.state.grade} onChange={this.onGradeValueChange} />
                    </div>
                </div>
                <div className="add-form-button-container">
                    <Flex space="between">
                        <Button icon={<ChevronStartIcon />} content={this.localize("adminBackButtonText")} text onClick={this.onBackButtonClick} />
                        <Flex gap="gap.small">
                            <Button content={this.localize("adminAddButtonText")} primary loading={this.state.isSubmitLoading} disabled={this.state.isSubmitLoading} onClick={this.onAddButtonClick} />
                        </Flex>
                    </Flex>
                    {this.getErrorMessage()}
                </div>
            </div>
        )
    }

    /**
    *Returns text component containing error message for failed grade field validations
    */
    private getErrorMessage = () => {

        if (!this.state.isGradeValuePresent) {
            return (<ErrorMessage errorMessage="adminGradeEmptyValidationMessage" />);
        } else if (this.state.isGradeTitleExists) {
            return (<ErrorMessage errorMessage="gradeAlreadyExistsValidationMessage" />);
        } else if (this.state.showErrorMessage) {
            return (<ErrorMessage errorMessage="generalErrorMessage" />);
        }

        return (<></>);
    }
}

export default withTranslation()(AddGrade);