﻿// <copyright file="UserLearningModuleViewModel.cs" company="Microsoft">
// Copyright (c) Microsoft. All rights reserved.
// </copyright>

namespace Microsoft.Teams.Apps.LearnNow.Models
{
    using System;
    using System.ComponentModel.DataAnnotations;
    using Microsoft.Teams.Apps.LearnNow.Helpers.CustomValidations;

    /// <summary>
    /// Model to handle user learning module details.
    /// </summary>
    public class UserLearningModuleViewModel
    {
        /// <summary>
        /// Gets or sets learning module id.
        /// </summary>
        [Required]
        [GuidValidation]
        public Guid LearningModuleId { get; set; }
    }
}