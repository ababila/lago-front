import { gql, useApolloClient } from '@apollo/client'
import { revalidateLogic } from '@tanstack/react-form'
import { useRef } from 'react'
import { generatePath } from 'react-router'
import { z } from 'zod'

import { useFormDialogOpeningDialog } from '~/components/dialogs/FormDialogOpeningDialog'
import { DialogResult } from '~/components/dialogs/types'
import { focusFirstInput } from '~/components/drawers/useFocusTrap'
import NameAndCodeGroup from '~/components/form/NameAndCodeGroup/NameAndCodeGroup'
import { addToast } from '~/core/apolloClient'
import { evictFromCache } from '~/core/apolloClient/evictFromCache'
import { IntegrationsTabsOptionsEnum } from '~/core/constants/tabsOptions'
import { applyExistingCodeError } from '~/core/form/existingCodeError'
import { IPAY_INTEGRATION_DETAILS_ROUTE, useNavigate } from '~/core/router'
import { zodOptionalUrl } from '~/formValidation/zodCustoms'
import {
  GetIpayIntegrationsListDocument,
  IpayIntegrationDetailsFragment,
  LagoApiError,
  useAddIpayPaymentProviderMutation,
  useDeleteIpayIntegrationMutation,
  useGetProviderByCodeForIpayLazyQuery,
  useUpdateIpayPaymentProviderMutation,
} from '~/generated/graphql'
import { useInternationalization } from '~/hooks/core/useInternationalization'
import { useAppForm } from '~/hooks/forms/useAppform'

gql`
  fragment AddIpayProviderDialog on IpayProvider {
    id
    name
    code
    secretKey
    webhookSecret
    successRedirectUrl
  }

  query getProviderByCodeForIpay($code: String) {
    paymentProvider(code: $code) {
      ... on IpayProvider {
        id
      }
      ... on FlutterwaveProvider {
        id
      }
      ... on CashfreeProvider {
        id
      }
      ... on GocardlessProvider {
        id
      }
      ... on AdyenProvider {
        id
      }
      ... on StripeProvider {
        id
      }
      ... on MoneyhashProvider {
        id
      }
    }
  }

  mutation addIpayPaymentProvider($input: AddIpayPaymentProviderInput!) {
    addIpayPaymentProvider(input: $input) {
      id
      ...AddIpayProviderDialog
    }
  }

  mutation updateIpayPaymentProvider($input: UpdateIpayPaymentProviderInput!) {
    updateIpayPaymentProvider(input: $input) {
      id
      ...AddIpayProviderDialog
    }
  }
`

const ADD_IPAY_FORM_ID = 'form-add-ipay-integration'

type AddIpayFormValues = {
  name: string
  code: string
  secretKey: string
  successRedirectUrl: string
}

const defaultFormValues: AddIpayFormValues = {
  name: '',
  code: '',
  secretKey: '',
  successRedirectUrl: '',
}

const validationSchema = z.object({
  name: z.string().min(1, { message: 'text_624ea7c29103fd010732ab7d' }),
  code: z.string().min(1, { message: 'text_624ea7c29103fd010732ab7d' }),
  secretKey: z
    .string()
    .min(1, { message: 'text_624ea7c29103fd010732ab7d' })
    .regex(/^(sk_(sandbox|live)_|•)/, { message: 'text_1793117191354vyh19f9k8yf' }),
  successRedirectUrl: zodOptionalUrl.refine((value) => !value || value.startsWith('https://'), {
    message: 'text_1793117191354pipj9icikqq',
  }),
})

type OpenAddIpayDialogData = {
  provider?: IpayIntegrationDetailsFragment
  deleteCallback?: () => void
}

export const useAddIpayDialog = () => {
  const { translate } = useInternationalization()
  const navigate = useNavigate()
  const formDialogOpeningDialog = useFormDialogOpeningDialog()
  const client = useApolloClient()

  const dataRef = useRef<OpenAddIpayDialogData | null>(null)
  const successRef = useRef(false)

  const [addIpayProvider] = useAddIpayPaymentProviderMutation({
    onCompleted(data) {
      if (data?.addIpayPaymentProvider) {
        successRef.current = true
        addToast({
          severity: 'success',
          translateKey: 'text_17931141481663qejpsfnzh7',
        })
        navigate(
          generatePath(IPAY_INTEGRATION_DETAILS_ROUTE, {
            integrationId: data.addIpayPaymentProvider.id,
            integrationGroup: IntegrationsTabsOptionsEnum.Community,
          }),
        )
      }
    },
  })

  const [updateIpayProvider] = useUpdateIpayPaymentProviderMutation({
    onCompleted(data) {
      if (data?.updateIpayPaymentProvider) {
        successRef.current = true
        addToast({
          severity: 'success',
          translateKey: 'text_1793114148166wpd01yxldtt',
        })
      }
    },
    onError() {
      addToast({
        severity: 'danger',
        translateKey: 'text_629728388c4d2300e2d380d5',
      })
    },
  })

  const [getProviderByCode] = useGetProviderByCodeForIpayLazyQuery()

  const [deleteIpay] = useDeleteIpayIntegrationMutation()

  const form = useAppForm({
    defaultValues: defaultFormValues,
    validationLogic: revalidateLogic(),
    validators: {
      onDynamic: validationSchema,
    },
    onSubmit: async ({ value, formApi }) => {
      const ipayProvider = dataRef.current?.provider
      const isEdition = !!ipayProvider
      const { name, code, secretKey, successRedirectUrl } = value

      const res = await getProviderByCode({
        context: { silentErrorCodes: [LagoApiError.NotFound] },
        variables: {
          code,
        },
      })
      const isNotAllowedToMutate =
        (!!res.data?.paymentProvider?.id && !isEdition) ||
        (isEdition &&
          !!res.data?.paymentProvider?.id &&
          res.data?.paymentProvider?.id !== ipayProvider?.id)

      if (isNotAllowedToMutate) {
        applyExistingCodeError(formApi)
        return
      }

      if (isEdition) {
        await updateIpayProvider({
          variables: {
            input: {
              id: ipayProvider?.id || '',
              name,
              code,
              successRedirectUrl: successRedirectUrl || undefined,
            },
          },
        })
      } else {
        await addIpayProvider({
          variables: {
            input: {
              name,
              code,
              secretKey,
              successRedirectUrl: successRedirectUrl || undefined,
            },
          },
        })
      }
    },
  })

  const handleSubmit = async (): Promise<DialogResult> => {
    successRef.current = false
    await form.handleSubmit()

    if (!successRef.current) {
      throw new Error('Submit failed')
    }

    return { reason: 'success' }
  }

  const openAddIpayDialog = (data?: OpenAddIpayDialogData) => {
    dataRef.current = data ?? null
    const ipayProvider = data?.provider
    const isEdition = !!ipayProvider

    form.reset()
    if (ipayProvider) {
      form.setFieldValue('name', ipayProvider.name || '')
      form.setFieldValue('code', ipayProvider.code || '')
      form.setFieldValue('secretKey', ipayProvider.secretKey || '')
      form.setFieldValue('successRedirectUrl', ipayProvider.successRedirectUrl || '')
    }

    formDialogOpeningDialog
      .open({
        title: translate(
          isEdition ? 'text_1793114148166p9th2sfm58r' : 'text_17931141481664aoggezsxhi',
        ),
        description: translate('text_179311414816663uhp13u7a6'),
        children: (
          <div className="flex flex-col gap-6 p-8">
            <NameAndCodeGroup
              form={form}
              fields={{ name: 'name', code: 'code' }}
              disableAutoGenerateCode={isEdition}
              nameProps={{
                label: translate('text_6584550dc4cec7adf861504d'),
                placeholder: translate('text_6584550dc4cec7adf861504f'),
              }}
              codeProps={{
                label: translate('text_6584550dc4cec7adf8615051'),
                placeholder: translate('text_6584550dc4cec7adf8615053'),
              }}
            />
            <form.AppField name="secretKey">
              {(field) => (
                <field.TextInputField
                  disabled={isEdition}
                  beforeChangeFormatter="trim"
                  label={translate('text_17497252876688ai900wowoc')}
                  placeholder={translate('text_1793114148166rt4bqcxsifr')}
                />
              )}
            </form.AppField>
            <form.AppField name="successRedirectUrl">
              {(field) => (
                <field.TextInputField
                  beforeChangeFormatter="trim"
                  label={translate('text_65367cb78324b77fcb6af21c')}
                  placeholder={translate('text_1733303818769298k0fvsgcz')}
                  helperText={translate('text_1793117191354l9hic5vwvul')}
                />
              )}
            </form.AppField>
          </div>
        ),
        closeOnError: false,
        onEntered: focusFirstInput,
        mainAction: (
          <form.AppForm>
            <form.SubmitButton>
              {translate(
                isEdition ? 'text_65845f35d7d69c3ab4793dac' : 'text_17931141481664aoggezsxhi',
              )}
            </form.SubmitButton>
          </form.AppForm>
        ),
        form: {
          id: ADD_IPAY_FORM_ID,
          submit: handleSubmit,
        },
        canOpenDialog: isEdition,
        openDialogText: translate('text_65845f35d7d69c3ab4793dad'),
        otherDialogProps: {
          title: translate('text_1749799070145vfvz9sq757a', { name: ipayProvider?.name }),
          description: translate('text_1793114148167pu7zn8pzr27'),
          actionText: translate('text_1749799070145czycjo9guoq'),
          colorVariant: 'danger',
          onAction: async () => {
            const result = await deleteIpay({
              variables: { input: { id: ipayProvider?.id as string } },
            })

            const destroyedId = result.data?.destroyPaymentProvider?.id

            if (destroyedId) {
              evictFromCache(client, {
                id: destroyedId,
                __typename: 'IpayProvider',
                listFieldName: 'paymentProviders',
                listQueryDocument: GetIpayIntegrationsListDocument,
              })

              data?.deleteCallback?.()

              addToast({
                message: translate('text_1793114148167bsweqjhdebp'),
                severity: 'success',
              })
            }
          },
        },
      })
      .then((response) => {
        if (response.reason === 'close' || response.reason === 'open-other-dialog') {
          form.reset()
          dataRef.current = null
        }
      })
  }

  return { openAddIpayDialog }
}
